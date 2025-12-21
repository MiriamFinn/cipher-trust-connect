import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Lock, TrendingUp, Clock, RefreshCw } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount, usePublicClient, useWatchContractEvent } from "wagmi";
import { toast } from "sonner";
import { parseEther, formatEther } from "viem";
import { useCipherLending } from "@/hooks/useCipherLending";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import LoanDetailsDialog from "./LoanDetailsDialog";
import { CipherLendingABI } from "@/abi/CipherLendingABI";

interface LenderOffer {
  offerId: bigint;
  lender: string;
  borrowerRequestId: bigint;
  amount: bigint;
  apr: number; // in basis points
  term: number;
  isActive: boolean;
}

interface BorrowerRequest {
  requestId: bigint;
  borrower: string;
  amount: bigint;
  term: number;
  isActive: boolean;
}

const BorrowPanel = () => {
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  const { 
    submitEncryptedBorrowerRequest, 
    getOffersForRequest,
    getBorrowerRequest,
    contractAddress,
    isContractValid
  } = useCipherLending();
  const { addTransaction, updateTransaction } = useTransactionHistory();

  // Helper function to get current request count from contract
  const getBorrowerRequestsCount = useCallback(async (): Promise<bigint> => {
    if (!isContractValid || !publicClient || !contractAddress) {
      return 0n;
    }
    try {
      const count = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: CipherLendingABI.abi,
        functionName: 'getBorrowerRequestsCount',
      });
      return count as bigint;
    } catch (error) {
      console.error('Error getting borrower requests count:', error);
      return 0n;
    }
  }, [isContractValid, publicClient, contractAddress]);
  
  const [loanAmount, setLoanAmount] = useState([5000]);
  const [encryptedScore] = useState(750); // Simulated encrypted score
  const [selectedOffer, setSelectedOffer] = useState<LenderOffer | null>(null);
  const [offers, setOffers] = useState<LenderOffer[]>([]);
  const [showOffers, setShowOffers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [myRequests, setMyRequests] = useState<BorrowerRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<bigint | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const lastFetchTimeRef = useRef<number>(0);
  const FETCH_DEBOUNCE_MS = 5000; // Minimum 5 seconds between fetches

  // Prevent hydration mismatch by only rendering dynamic content after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch offers for current request
  const fetchOffers = useCallback(async (requestId: bigint, showToast: boolean = false) => {
    if (!requestId && requestId !== 0n) return;
    
    setIsLoadingOffers(true);
    try {
      const offersData = await getOffersForRequest(requestId);
      setOffers(offersData);
      setShowOffers(true);
      
      if (showToast) {
        if (offersData.length === 0) {
          toast.info("No offers yet. Lenders will see your request and can make offers.");
        } else {
          toast.success(`Found ${offersData.length} offer${offersData.length > 1 ? 's' : ''}!`);
        }
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
      toast.error("Failed to fetch offers");
    } finally {
      setIsLoadingOffers(false);
    }
  }, [getOffersForRequest]);

  // Fetch all requests for the current user
  const fetchMyRequests = useCallback(async () => {
    if (!isConnected || !address || !isContractValid || !publicClient || !contractAddress) {
      return;
    }

    // Debounce: prevent fetching too frequently
    const now = Date.now();
    if (now - lastFetchTimeRef.current < FETCH_DEBOUNCE_MS) {
      return;
    }
    lastFetchTimeRef.current = now;

    setIsLoadingRequests(true);
    try {
      // Get total request count
      const totalRequests = await getBorrowerRequestsCount();
      
      if (!totalRequests || totalRequests === 0n) {
        setMyRequests([]);
        return;
      }

      // Fetch all requests and filter for current user's active requests
      const myRequestsList: BorrowerRequest[] = [];
      for (let i = 0n; i < totalRequests; i++) {
        try {
          const request = await getBorrowerRequest(i);
          const [borrower, amount, term, isActive] = request;
          
          // Only include active requests from current user
          if (borrower.toLowerCase() === address.toLowerCase() && isActive) {
            myRequestsList.push({
              requestId: i,
              borrower,
              amount,
              term,
              isActive,
            });
          }
        } catch (error) {
          console.warn(`Error fetching request ${i}:`, error);
        }
      }

      setMyRequests(myRequestsList);

      // If there are requests, select the latest one
      // The useEffect will handle loading offers when selectedRequestId changes
      if (myRequestsList.length > 0) {
        const latestRequest = myRequestsList[myRequestsList.length - 1];
        setSelectedRequestId(latestRequest.requestId);
      }
    } catch (error) {
      console.error("Error fetching my requests:", error);
      toast.error("Failed to load your requests");
    } finally {
      setIsLoadingRequests(false);
    }
  }, [isConnected, address, isContractValid, publicClient, contractAddress, getBorrowerRequestsCount, getBorrowerRequest]);

  const handleRequestOffers = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsSubmitting(true);
    const amountInWei = parseEther(loanAmount[0].toString());
    let txId: string | undefined;

    try {
      // Record transaction start
      txId = addTransaction({
        type: 'borrow_request',
        status: 'pending',
        details: {
          amount: `$${loanAmount[0].toLocaleString()}`,
          amountWei: amountInWei,
          term: 12,
          creditScore: encryptedScore,
        },
      });

      // Submit encrypted borrower request
      toast.info("Please confirm the transaction in your wallet...");
      
      const txHash = await submitEncryptedBorrowerRequest(
        encryptedScore,
        amountInWei,
        12 // term in months
      );

      if (!txHash) {
        if (txId) {
          updateTransaction(txId, {
            status: 'failed',
            error: 'Transaction was not submitted',
          });
        }
        toast.error("Transaction was not submitted. Please try again.");
        return;
      }

      // Update transaction with hash
      if (txId) {
        updateTransaction(txId, {
          txHash: txHash as `0x${string}`,
        });
      }

      // Wait for transaction to be mined
      if (publicClient) {
        toast.info("Transaction submitted! Waiting for confirmation...");
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        // Get the request ID from the transaction (if available)
        // For now, we'll update the transaction status
        if (txId) {
          updateTransaction(txId, {
            status: 'success',
            details: {
              amount: `$${loanAmount[0].toLocaleString()}`,
              amountWei: amountInWei,
              term: 12,
              creditScore: encryptedScore,
              // requestId will be updated after fetching requests
            },
          });
        }

        toast.success("Loan request submitted successfully!");
        
        // Refresh the list of user's requests (which will auto-select the new one)
        await fetchMyRequests();
        
        // Try to get the new request ID and update transaction
        // Note: We need to get the updated requests after fetchMyRequests
        // The state update is async, so we'll get the count and use the latest index
        const totalRequests = await getBorrowerRequestsCount();
        if (txId && totalRequests > 0n) {
          const newRequestId = totalRequests - 1n; // Latest request is at index (count - 1)
          updateTransaction(txId, {
            details: {
              amount: `$${loanAmount[0].toLocaleString()}`,
              amountWei: amountInWei,
              term: 12,
              creditScore: encryptedScore,
              requestId: newRequestId,
            },
          });
        }
      } else {
        toast.success("Transaction submitted! Waiting for confirmation...");
        if (txId) {
          updateTransaction(txId, {
            status: 'success',
            txHash: txHash as `0x${string}`,
          });
        }
        // Fallback: refresh requests after a delay
        setTimeout(async () => {
          await fetchMyRequests();
        }, 3000);
      }
    } catch (error: any) {
      console.error("Error submitting borrower request:", error);
      
      // Update transaction status to failed
      if (txId) {
        updateTransaction(txId, {
          status: 'failed',
          error: error?.message || "Unknown error",
        });
      }
      
      // Handle user rejection
      if (error?.message?.includes("User rejected") || error?.message?.includes("User denied")) {
        toast.error("Transaction was rejected. Please try again.");
      } else {
        toast.error(`Failed to submit borrower request: ${error?.message || "Unknown error"}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load user's requests when component mounts or when account changes
  useEffect(() => {
    if (isConnected && address && isContractValid) {
      fetchMyRequests();
    } else {
      // Reset state when disconnected
      setMyRequests([]);
      setSelectedRequestId(null);
      setOffers([]);
      setShowOffers(false);
    }
  }, [isConnected, address, isContractValid, fetchMyRequests]);

  // Load offers when selected request changes (manual selection or initial load)
  useEffect(() => {
    if (selectedRequestId !== null) {
      // Don't show toast on initial load or when switching requests
      fetchOffers(selectedRequestId, false);
    }
  }, [selectedRequestId, fetchOffers]);

  // Watch for new lender offers and auto-refresh
  useWatchContractEvent({
    address: contractAddress as `0x${string}` | undefined,
    abi: CipherLendingABI.abi,
    eventName: 'NewLenderOffer',
    onLogs(logs) {
      logs.forEach((log) => {
        const requestId = log.args.requestId as bigint;
        // If the new offer is for the currently selected request, refresh offers
        if (selectedRequestId !== null && requestId === selectedRequestId) {
          console.log('New offer detected for current request, refreshing...');
          // Small delay to ensure contract state is updated
          setTimeout(() => {
            fetchOffers(selectedRequestId, true);
          }, 1000);
        }
      });
    },
    enabled: isContractValid && selectedRequestId !== null,
  });

  // Poll for new offers periodically (every 10 seconds) as a backup
  useEffect(() => {
    if (!isContractValid || selectedRequestId === null) {
      return;
    }

    const pollInterval = setInterval(() => {
      if (selectedRequestId !== null) {
        fetchOffers(selectedRequestId, false);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }, [isContractValid, selectedRequestId, fetchOffers]);

  const handleViewDetails = (offer: LenderOffer) => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    if (!offer.isActive) {
      toast.error("This offer is no longer active");
      return;
    }
    setSelectedOffer(offer);
  };

  // Format offer for display
  const formatOffer = (offer: LenderOffer) => {
    const amountEth = parseFloat(formatEther(offer.amount));
    const aprPercent = offer.apr / 100; // Convert basis points to percentage
    
    return {
      lender: `${offer.lender.substring(0, 6)}...${offer.lender.substring(38)}`, // Shortened address
      lenderFull: offer.lender,
      rate: `${aprPercent.toFixed(2)}%`,
      amount: `$${amountEth.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`,
      amountWei: offer.amount, // Include raw amount in wei for contract calls
      term: `${offer.term} months`,
      encrypted: true,
      offerId: offer.offerId,
    };
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-white shadow-sm">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold">Your Encrypted Score</h3>
              <Lock className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-4xl font-bold text-purple-600 mb-2">***</div>
            <p className="text-sm text-muted-foreground">Actual Score: {encryptedScore} (Only visible to you)</p>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Loan Amount</label>
                <span className="text-lg font-bold text-blue-600">${loanAmount[0].toLocaleString()}</span>
              </div>
              <Slider
                value={loanAmount}
                onValueChange={setLoanAmount}
                max={50000}
                min={1000}
                step={500}
                className="mb-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>$1,000</span>
                <span>$50,000</span>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Encrypted Matching</p>
                  <p className="text-muted-foreground">
                    Lenders see encrypted data only. Your score is protected by FHE computation.
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-teal-500 hover:opacity-90 transition-opacity"
              size="lg"
              onClick={handleRequestOffers}
              disabled={isSubmitting}
            >
              <TrendingUp className="mr-2 h-5 w-5" />
              {isSubmitting ? "Submitting..." : "Request Loan Offers"}
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Available Offers</h3>
            {selectedRequestId !== null && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedRequestId !== null) {
                    fetchOffers(selectedRequestId, true);
                  }
                }}
                disabled={isLoadingOffers}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingOffers ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>

          {/* Request Selector */}
          {isMounted && isLoadingRequests && (
            <Card className="p-4 bg-gradient-to-br from-gray-50 to-white">
              <p className="text-sm text-muted-foreground text-center">Loading your requests...</p>
            </Card>
          )}

          {isMounted && !isLoadingRequests && myRequests.length > 0 && (
            <Card className="p-4 bg-blue-50 border border-blue-200">
              <label className="text-sm font-medium mb-2 block">Select Request:</label>
              <select
                value={selectedRequestId?.toString() || ''}
                onChange={(e) => {
                  const requestId = BigInt(e.target.value);
                  setSelectedRequestId(requestId);
                }}
                className="w-full px-3 py-2 border rounded-md text-sm bg-white"
              >
                {isMounted && myRequests.map((req) => {
                  const amountEth = parseFloat(formatEther(req.amount));
                  return (
                    <option key={req.requestId.toString()} value={req.requestId.toString()}>
                      Request #{req.requestId.toString()} - ${amountEth.toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })} - {req.term} months
                    </option>
                  );
                })}
              </select>
            </Card>
          )}

          {isMounted && !isLoadingRequests && myRequests.length === 0 && !showOffers && (
            <Card className="p-8 text-center bg-gradient-to-br from-gray-50 to-white">
              <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Request loan offers to see encrypted matches from lenders
              </p>
            </Card>
          )}
          {isMounted && showOffers && isLoadingOffers && offers.length === 0 && (
            <Card className="p-8 text-center bg-gradient-to-br from-gray-50 to-white">
              <p className="text-muted-foreground">Loading offers...</p>
            </Card>
          )}
          {isMounted && showOffers && !isLoadingOffers && offers.length === 0 && (
            <Card className="p-8 text-center bg-gradient-to-br from-gray-50 to-white">
              <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No offers yet</p>
              <p className="text-sm text-muted-foreground">
                Your request has been submitted. Lenders will see your request and can make offers.
              </p>
            </Card>
          )}
          {isMounted && showOffers && offers.length > 0 && (
            offers.map((offer) => {
              const formattedOffer = formatOffer(offer);
              return (
                <Card key={offer.offerId.toString()} className="p-5 bg-gradient-to-br from-white to-blue-50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{formattedOffer.lender}</h4>
                        {formattedOffer.encrypted && <Lock className="h-4 w-4 text-purple-600" />}
                      </div>
                      <p className="text-sm text-muted-foreground">Matched via encrypted scoring</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{formattedOffer.rate}</div>
                      <p className="text-xs text-muted-foreground">APR</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Amount</p>
                      <p className="font-semibold">{formattedOffer.amount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Term</p>
                      <p className="font-semibold flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formattedOffer.term}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                    onClick={() => handleViewDetails(offer)}
                    disabled={!offer.isActive}
                  >
                    View Details
                  </Button>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {selectedOffer && (
        <LoanDetailsDialog
          open={!!selectedOffer}
          onOpenChange={(open) => !open && setSelectedOffer(null)}
          offer={formatOffer(selectedOffer)}
          offerId={selectedOffer.offerId}
        />
      )}
    </>
  );
};

export default BorrowPanel;

