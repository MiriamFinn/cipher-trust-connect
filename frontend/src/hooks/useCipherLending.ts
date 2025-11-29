import { useCallback, useMemo } from "react";
import { useAccount, usePublicClient, useWriteContract, useWalletClient } from "wagmi";
import { parseEther } from "viem";
import { toast } from "sonner";
import { CipherLendingABI } from "@/abi/CipherLendingABI";
import { CipherLendingAddresses } from "@/abi/CipherLendingAddresses";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "./useInMemoryStorage";

// Get contract address based on chain ID
function getContractAddress(chainId: number | undefined): string | null {
  if (!chainId) return null;
  
  const chainIdStr = chainId.toString();
  const addressInfo = CipherLendingAddresses[chainIdStr as keyof typeof CipherLendingAddresses];
  
  if (!addressInfo || !addressInfo.address) {
    return null;
  }
  
  // Don't use zero address
  if (addressInfo.address === "0x0000000000000000000000000000000000000000") {
    return null;
  }
  
  return addressInfo.address;
}

export const useCipherLending = () => {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const { instance } = useFhevm({
    provider: typeof window !== 'undefined' ? (window as any).ethereum : undefined,
    chainId,
  });
  const { storage } = useInMemoryStorage();

  const contractAddress = useMemo(() => getContractAddress(chainId), [chainId]);
  
  const isContractValid = useMemo(() => {
    return contractAddress !== null && contractAddress !== "0x0000000000000000000000000000000000000000";
  }, [contractAddress]);

  const submitEncryptedBorrowerRequest = useCallback(async (
    creditScore: number,
    amount: bigint,
    termMonths: number
  ): Promise<`0x${string}` | null> => {
    if (!instance || !contractAddress || !address) {
      toast.error("FHEVM instance or contract not ready");
      return null;
    }

    try {
      // Create encrypted input for credit score
      const input = instance.createEncryptedInput(contractAddress, address);
      input.add32(creditScore);
      
      // Encrypt the input
      const encryptedInput = await input.encrypt();
      
      // FHEVM returns handles and inputProof
      // Ensure they are strings (they should be, but double-check)
      const handleRaw = encryptedInput.handles[0];
      const proofRaw = encryptedInput.inputProof;
      
      // Convert to strings if needed
      let handle: string;
      let inputProof: string;
      
      if (typeof handleRaw === 'string') {
        handle = handleRaw.startsWith('0x') ? handleRaw : `0x${handleRaw}`;
      } else if (handleRaw instanceof Uint8Array) {
        // Convert Uint8Array to hex string
        handle = '0x' + Array.from(handleRaw).map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        handle = String(handleRaw);
        if (!handle.startsWith('0x')) {
          handle = `0x${handle}`;
        }
      }
      
      if (typeof proofRaw === 'string') {
        inputProof = proofRaw.startsWith('0x') ? proofRaw : `0x${proofRaw}`;
      } else if (proofRaw instanceof Uint8Array) {
        // Convert Uint8Array to hex string
        inputProof = '0x' + Array.from(proofRaw).map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        inputProof = String(proofRaw);
        if (!inputProof.startsWith('0x')) {
          inputProof = `0x${inputProof}`;
        }
      }
      
      console.log('Encrypted input:', {
        handle,
        handleType: typeof handle,
        handleLength: handle.length,
        inputProofLength: inputProof.length,
        proofType: typeof inputProof,
        handleRawType: typeof handleRaw,
        proofRawType: typeof proofRaw
      });
      
      // Call contract to submit borrower request
      // writeContractAsync will trigger wallet confirmation dialog
      const hash = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: CipherLendingABI.abi,
        functionName: 'submitBorrowerRequest',
        args: [
          handle,        // externalEuint32 encryptedScore (bytes32 - hex string)
          amount,        // uint256 amount
          termMonths,    // uint32 term
          inputProof     // bytes calldata inputProof (hex string)
        ],
      });
      
      return hash;
    } catch (error) {
      console.error("Error submitting borrower request:", error);
      toast.error("Failed to submit borrower request");
      return null;
    }
  }, [instance, contractAddress, address, writeContractAsync]);

  const getBorrowerRequest = useCallback(async (requestId: bigint) => {
    if (!publicClient || !contractAddress) {
      throw new Error("Contract not available");
    }

    try {
      const result = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: CipherLendingABI.abi,
        functionName: 'getBorrowerRequest',
        args: [requestId],
      }) as [string, bigint, number, boolean];
      
      return result;
    } catch (error) {
      console.error("Error fetching borrower request:", error);
      throw error;
    }
  }, [publicClient, contractAddress]);

  const findEncryptedMatches = useCallback(async (minScore: number): Promise<bigint[]> => {
    if (!publicClient || !contractAddress) {
      return [];
    }

    try {
      // Call contract's findMatches function to get all active requests
      // Note: findMatches returns all active requests, filtering by score is done via checkScoreMatch
      const matchingRequestIds = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: CipherLendingABI.abi,
        functionName: 'findMatches',
        args: [minScore], // minScore parameter (not used in contract but required)
      }) as bigint[];
      
      return matchingRequestIds || [];
    } catch (error) {
      console.error("Error finding encrypted matches:", error);
      toast.error("Failed to find matches");
      return [];
    }
  }, [publicClient, contractAddress]);

  const checkScoreMatch = useCallback(async (
    requestId: bigint,
    minScore: number
  ): Promise<boolean | null> => {
    if (!instance || !contractAddress || !address || !publicClient || !walletClient) {
      return null;
    }

    try {
      // Step 1: Call checkScoreMatch contract function to get encrypted comparison result (ebool)
      // This is a write operation because FHE operations modify state
      console.log(`[checkScoreMatch] Calling contract checkScoreMatch for requestId ${requestId}, minScore ${minScore}`);
      
      const txHash = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: CipherLendingABI.abi,
        functionName: 'checkScoreMatch',
        args: [requestId, minScore],
      });

      if (!txHash) {
        console.error("[checkScoreMatch] Transaction hash is null");
        return null;
      }

      // Step 2: Wait for transaction to be mined
      console.log(`[checkScoreMatch] Waiting for transaction ${txHash}...`);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log(`[checkScoreMatch] Transaction confirmed in block ${receipt.blockNumber}`);

      // Step 3: Get the comparison result handle from contract
      // The contract stores the result in comparisonResults mapping
      const comparisonResultHandle = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: CipherLendingABI.abi,
        functionName: 'getComparisonResult',
        args: [requestId, minScore, address],
      }) as string;

      if (!comparisonResultHandle || comparisonResultHandle === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        console.warn("[checkScoreMatch] Comparison result handle is zero or invalid");
        return null;
      }

      console.log(`[checkScoreMatch] Got comparison result handle: ${comparisonResultHandle}`);

      // Step 4: Decrypt the ebool result using FHEVM userDecrypt
      const keypair = instance.generateKeypair();
      const handleContractPairs = [{
        handle: comparisonResultHandle,
        contractAddress: contractAddress,
      }];

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = "7";
      const contractAddresses = [contractAddress];

      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays
      );

      // Sign the decryption request
      const signature = await walletClient.signTypedData({
        account: address,
        domain: eip712.domain as any,
        types: {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        primaryType: 'UserDecryptRequestVerification',
        message: eip712.message as any,
      });

      // Decrypt the ebool result
      const decryptionResult = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      // Get the decrypted boolean value
      const decryptedBool = decryptionResult[comparisonResultHandle];
      const isMatch = decryptedBool === true || decryptedBool === 1 || decryptedBool === "1" || decryptedBool === "true";
      
      console.log(`[checkScoreMatch] Decrypted result: ${decryptedBool}, isMatch: ${isMatch}`);
      
      return isMatch;
    } catch (error) {
      console.error("Error checking score match:", error);
      return null;
    }
  }, [instance, contractAddress, address, publicClient, walletClient, writeContractAsync]);

  const getOffersForRequest = useCallback(async (requestId: bigint) => {
    if (!publicClient || !contractAddress) {
      return [];
    }

    try {
      // Get total number of offers
      const totalOffers = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: CipherLendingABI.abi,
        functionName: 'getLenderOffersCount',
      }) as bigint;

      const offers = [];
      
      // Iterate through all offers and filter by borrowerRequestId
      for (let i = 0n; i < totalOffers; i++) {
        try {
          const offer = await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: CipherLendingABI.abi,
            functionName: 'getLenderOffer',
            args: [i],
          }) as [string, bigint, bigint, number, number, boolean];
          
          const [lender, borrowerRequestId, amount, apr, term, isActive] = offer;
          
          // Only include offers for this request
          if (borrowerRequestId === requestId && isActive) {
            offers.push({
              offerId: i,
              lender,
              borrowerRequestId,
              amount,
              apr,
              term,
              isActive,
            });
          }
        } catch (error) {
          console.warn(`Error fetching offer ${i}:`, error);
        }
      }
      
      return offers;
    } catch (error) {
      console.error("Error fetching offers:", error);
      return [];
    }
  }, [publicClient, contractAddress]);

  return {
    contractAddress,
    isContractValid,
    submitEncryptedBorrowerRequest,
    getBorrowerRequest,
    findEncryptedMatches,
    checkScoreMatch,
    getOffersForRequest,
  };
};

