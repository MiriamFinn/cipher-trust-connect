# Cipher Trust Connect MVP

A privacy-first encrypted lending platform built with Fully Homomorphic Encryption (FHE) using FHEVM. This platform enables borrowers and lenders to exchange credit information and loan offers without revealing sensitive financial data.

## 🌐 Live Demo

**Vercel Deployment**: [https://cipher-trust-connect.vercel.app/](https://cipher-trust-connect-pro.vercel.app/)

## 📹 Demo Video

Watch the demo video to see the platform in action: (https://youtu.be/hi9HSN64UYE)

## Overview

Cipher Trust Connect enables borrowers and lenders to exchange credit information and loan offers without revealing sensitive financial data. The platform uses Fully Homomorphic Encryption (FHE) to perform computations on encrypted data, ensuring complete privacy protection. Credit scores are never decrypted during the matching process - only encrypted comparison results (true/false) are decrypted.

## Architecture

### Smart Contracts

- **CipherLending.sol**: Main lending contract implementing FHE-based matching and loan creation
- Built on FHEVM for encrypted computation capabilities
- Supports encrypted credit score storage and homomorphic comparison operations

### Frontend

- **Vite** + **React Router** with TypeScript
- **RainbowKit** for Web3 wallet connection
- **shadcn/ui** (Radix UI) for modern UI components
- **Tailwind CSS** for styling
- **Wagmi v2** for blockchain interaction
- **FHEVM** for client-side encryption/decryption operations

## Key Features

### For Borrowers
1. Submit encrypted credit score and loan requirements
2. Receive loan offers without revealing personal data
3. Accept offers with full privacy protection
4. Transparent loan terms and conditions

### For Lenders
1. Set lending criteria (minimum credit score, amount, term)
2. Find matching borrowers using encrypted score comparison
3. Make competitive offers
4. Automated fund transfer upon loan acceptance

### Privacy Protection
- **Fully Homomorphic Encryption**: All sensitive data remains encrypted
- **Zero-Knowledge Matching**: Credit score comparisons happen in encrypted domain
- **Selective Decryption**: Only comparison results (boolean) are decrypted, never the actual score
- **Anonymous Transactions**: No personal data exposure during lending process

## Smart Contract Code

The main contract is located at [`contracts/CipherLending.sol`](./contracts/CipherLending.sol). Key functions include:

### Core Functions

1. **`submitBorrowerRequest(encryptedScore, amount, term, inputProof)`**
   - Submits a borrower request with encrypted credit score
   - Uses FHEVM's `externalEuint32` type for encrypted input
   - Sets ACL permissions for decryption

2. **`findMatches(minScore)`**
   - Returns all active borrower request IDs
   - Note: Actual score filtering is done via `checkScoreMatch()`

3. **`checkScoreMatch(requestId, minScore)`**
   - Performs homomorphic comparison: `encryptedScore >= minScore`
   - Returns encrypted boolean (`ebool`) result
   - Stores result in `comparisonResults` mapping for caller

4. **`getComparisonResult(requestId, minScore, caller)`**
   - Retrieves stored encrypted comparison result
   - Used by frontend to get the handle for decryption

5. **`submitLenderOffer(borrowerRequestId, amount, apr, term)`**
   - Creates a lender offer for a specific borrower request

6. **`acceptLoanOffer(offerId)`**
   - Borrower accepts a lender offer and creates a loan

### Contract Addresses

- **Hardhat (Local)**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Sepolia Testnet**: See `deployments/sepolia/CipherLending.json`

## Key Data Encryption/Decryption Logic

### 1. Borrower Request Submission (Encryption)

When a borrower submits a loan request, the credit score is encrypted on the client side:

```typescript
// Frontend: useCipherLending.ts
const input = instance.createEncryptedInput(contractAddress, address);
input.add32(creditScore);  // Add credit score (300-850)
const encryptedInput = await input.encrypt();

// Extract handle and proof
const handle = encryptedInput.handles[0];  // bytes32 handle
const inputProof = encryptedInput.inputProof;  // bytes proof

// Submit to contract
await writeContractAsync({
  functionName: 'submitBorrowerRequest',
  args: [handle, amount, termMonths, inputProof]
});
```

**Contract Side**:
```solidity
// CipherLending.sol
function submitBorrowerRequest(
    externalEuint32 encryptedScore,
    uint256 amount,
    uint32 term,
    bytes calldata inputProof
) external {
    // Convert external encrypted value to internal euint32
    euint32 score = FHE.fromExternal(encryptedScore, inputProof);
    
    // Set ACL: allow contract and borrower to decrypt
    FHE.allowThis(score);
    FHE.allow(score, msg.sender);
    
    // Store encrypted score (never decrypted during matching)
    borrowerRequests.push(BorrowerRequest({
        borrower: msg.sender,
        encryptedScore: score,  // Stored as euint32
        amount: amount,
        term: term,
        isActive: true
    }));
}
```

### 2. Score Matching (Homomorphic Comparison)

Lenders search for borrowers by comparing encrypted scores without decrypting them:

**Step 1: Contract performs homomorphic comparison**
```solidity
// CipherLending.sol
function checkScoreMatch(uint256 requestId, uint32 minScore) 
    external returns (ebool) {
    BorrowerRequest storage request = borrowerRequests[requestId];
    
    // Encrypt the minScore threshold
    euint32 minScoreEncrypted = FHE.asEuint32(minScore);
    
    // Homomorphic comparison: encryptedScore >= minScoreEncrypted
    // Returns encrypted boolean (ebool) - result is still encrypted!
    ebool comparisonResult = FHE.ge(request.encryptedScore, minScoreEncrypted);
    
    // Store result and allow caller to decrypt
    comparisonResults[requestId][minScore][msg.sender] = comparisonResult;
    FHE.allowThis(comparisonResult);
    FHE.allow(comparisonResult, msg.sender);
    
    return comparisonResult;
}
```

**Step 2: Frontend retrieves comparison result handle**
```typescript
// Frontend: useCipherLending.ts
// 1. Call contract to perform comparison (write operation)
const txHash = await writeContractAsync({
  functionName: 'checkScoreMatch',
  args: [requestId, minScore]
});

// 2. Wait for transaction confirmation
await publicClient.waitForTransactionReceipt({ hash: txHash });

// 3. Get the encrypted comparison result handle
const comparisonResultHandle = await publicClient.readContract({
  functionName: 'getComparisonResult',
  args: [requestId, minScore, address]
});
```

**Step 3: Decrypt only the comparison result (not the score)**
```typescript
// Frontend: useCipherLending.ts
// Generate keypair for decryption
const keypair = instance.generateKeypair();

// Create EIP-712 signature for decryption permission
const eip712 = instance.createEIP712(
  keypair.publicKey,
  [contractAddress],
  startTimeStamp,
  durationDays
);

// Sign decryption request
const signature = await walletClient.signTypedData({
  account: address,
  domain: eip712.domain,
  types: { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
  primaryType: 'UserDecryptRequestVerification',
  message: eip712.message,
});

// Decrypt the ebool result (NOT the score!)
const decryptionResult = await instance.userDecrypt(
  [{ handle: comparisonResultHandle, contractAddress }],
  keypair.privateKey,
  keypair.publicKey,
  signature.replace("0x", ""),
  [contractAddress],
  address,
  startTimeStamp,
  durationDays,
);

// Get decrypted boolean: true if score >= minScore, false otherwise
const isMatch = decryptionResult[comparisonResultHandle] === true || 
                decryptionResult[comparisonResultHandle] === 1;
```

### 3. Privacy Guarantees

- ✅ **Credit score is never decrypted** during matching
- ✅ **Only comparison results (true/false) are decrypted**
- ✅ **Homomorphic operations** allow computation on encrypted data
- ✅ **ACL (Access Control List)** restricts who can decrypt what
- ✅ **Zero-knowledge matching**: Lender only learns if score meets threshold, not the actual score

## Development Setup

### Prerequisites
- Node.js >= 20
- npm >= 7.0.0
- Hardhat for smart contract development
- MetaMask or compatible Web3 wallet

### Installation

1. Clone the repository:
```bash
git clone https://github.com/MiriamFinn/cipher-trust-connect.git
cd cipher-trust-connect
```

2. Install root dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd frontend && npm install
```

### Smart Contract Development

1. Compile contracts:
```bash
npm run compile
```

2. Run local tests:
```bash
npm run test
```

3. Start local Hardhat node:
```bash
npx hardhat node
```

4. Deploy to local network:
```bash
npx hardhat deploy --network localhost
```

5. Generate ABI files:
```bash
cd frontend && npm run genabi
```

### Frontend Development

1. Start development server:
```bash
cd frontend && npm run dev
```

2. Open [http://localhost:5173](http://localhost:5173)

3. Connect your wallet (MetaMask recommended)
4. Switch to Hardhat network (Chain ID: 31337) or Sepolia testnet

### Deployment

#### Local Development
```bash
npm run deploy:local
cd frontend && npm run genabi
```

#### Sepolia Testnet
```bash
npm run deploy:sepolia
cd frontend && npm run genabi
```

## Business Flow

### 10-Step MVP Process

1. **Borrower** connects wallet and navigates to "Borrow" tab
2. **Borrower** submits encrypted credit score and loan requirements
   - Credit score is encrypted using FHEVM on client side
   - Encrypted data (handle + proof) is sent to contract
3. **Contract** stores encrypted borrower request (score remains encrypted)
4. **Lender** sets minimum credit score threshold and investment amount
5. **Lender** clicks "Start Lending" to search for matches
6. **Contract** performs encrypted matching:
   - `findMatches()` returns all active requests
   - For each request, `checkScoreMatch()` performs homomorphic comparison
   - Only comparison result (true/false) is decrypted, NOT the actual score
7. **Lender** views matching encrypted borrower profiles (score never shown)
8. **Lender** submits loan offer with terms (APR, amount, term)
9. **Borrower** reviews available offers and accepts preferred offer
10. **Contract** creates loan and transfers funds (simulated in MVP)
11. **Privacy guarantee**: Credit score never exposed during entire process

## Security Features

- **FHE Encryption**: All credit scores encrypted using FHEVM
- **On-chain Verification**: Matching happens on-chain with encrypted computation
- **Zero Trust**: No intermediary can access sensitive borrower information
- **Selective Decryption**: Only comparison results decrypted, never raw scores
- **ACL Permissions**: Fine-grained control over who can decrypt what
- **Auditable**: All loan terms and transactions are publicly verifiable

## Testing

### Unit Tests
```bash
npm run test
```

### Sepolia Integration Tests
```bash
npm run test:sepolia
```

## Project Structure

```
cipher-trust-connect/
├── contracts/                 # Smart contracts
│   └── CipherLending.sol      # Main lending contract
├── deploy/                    # Deployment scripts
│   └── deploy.ts
├── test/                      # Test files
│   ├── CipherLending.ts      # Local tests
│   └── CipherLendingSepolia.ts
├── frontend/                  # Vite + React Router frontend
│   ├── src/
│   │   ├── abi/              # Auto-generated ABI files
│   │   ├── components/       # React components
│   │   │   ├── BorrowPanel.tsx
│   │   │   ├── LendPanel.tsx
│   │   │   └── ui/           # shadcn/ui components
│   │   ├── fhevm/            # FHEVM integration
│   │   ├── hooks/            # Custom hooks
│   │   │   ├── useCipherLending.ts  # Main contract interaction hook
│   │   │   └── useFhevm.tsx         # FHEVM instance management
│   │   ├── config/           # Wagmi configuration
│   │   └── pages/            # Route pages
│   ├── scripts/
│   │   └── genabi.mjs        # ABI generation script
│   └── package.json
├── deployments/              # Deployment artifacts
│   ├── localhost/
│   └── sepolia/
├── types/                    # TypeScript types
├── hardhat.config.ts        # Hardhat configuration
└── package.json
```

## Technologies Used

### Blockchain & Encryption
- **FHEVM**: Fully Homomorphic Encryption Virtual Machine
- **@fhevm/solidity**: FHE operations in Solidity
- **@zama-fhe/relayer-sdk**: Zama FHE relayer SDK
- **Solidity ^0.8.27**: Smart contract development
- **Hardhat**: Development environment

### Frontend
- **Vite**: Build tool and dev server
- **React 18**: UI library
- **React Router 6**: Client-side routing
- **TypeScript**: Type safety
- **Wagmi v2**: Ethereum interaction library
- **RainbowKit**: Web3 wallet connection UI
- **shadcn/ui (Radix UI)**: Accessible UI components
- **Tailwind CSS**: Utility-first CSS framework
- **TanStack Query**: Data fetching and caching
- **React Hook Form + Zod**: Form validation

### Development Tools
- **TypeChain**: TypeScript bindings for contracts
- **ESLint**: Code linting
- **Prettier**: Code formatting

## License

BSD-3-Clause-Clear

## Contributing

Please read our contributing guidelines before submitting pull requests.

## Acknowledgments

- **Zama**: FHEVM and FHE technology
- **FHEVM Community**: Support and documentation
