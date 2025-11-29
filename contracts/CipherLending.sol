// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title CipherLending - Privacy-First Encrypted Lending Platform
/// @author Cipher Trust Connect MVP
/// @notice A lending platform that uses Fully Homomorphic Encryption (FHE) to protect borrower privacy
contract CipherLending is SepoliaConfig {
    // Structs
    struct BorrowerRequest {
        address borrower;
        euint32 encryptedScore;    // Encrypted credit score (300-850)
        uint256 amount;             // Requested loan amount in wei
        uint32 term;               // Loan term in months
        bool isActive;
    }

    struct LenderOffer {
        address lender;
        uint256 borrowerRequestId;
        uint256 amount;             // Offered amount in wei
        uint32 apr;                // Annual percentage rate (basis points)
        uint32 term;               // Loan term in months
        bool isActive;
    }

    struct Loan {
        address borrower;
        address lender;
        uint256 amount;
        uint32 apr;
        uint32 term;
        uint32 startTime;
        bool isActive;
        bool isRepaid;
    }

    // State variables
    BorrowerRequest[] public borrowerRequests;
    LenderOffer[] public lenderOffers;
    Loan[] public loans;

    uint256 public nextLoanId;
    
    // Mapping to store comparison results: (requestId, minScore, caller) => ebool
    mapping(uint256 => mapping(uint32 => mapping(address => ebool))) public comparisonResults;

    // Events
    event NewBorrowerRequest(uint256 indexed requestId, address indexed borrower, uint256 amount);
    event NewLenderOffer(uint256 indexed offerId, uint256 indexed requestId, address indexed lender, uint256 amount);
    event LoanCreated(uint256 indexed loanId, address indexed borrower, address indexed lender, uint256 amount);
    event LoanRepaid(uint256 indexed loanId, uint256 amount);

    /// @notice Submit a new borrower request with encrypted credit score
    /// @param encryptedScore The encrypted credit score (300-850)
    /// @param amount The requested loan amount in wei
    /// @param term The loan term in months
    /// @param inputProof The FHE input proof for the credit score
    function submitBorrowerRequest(
        externalEuint32 encryptedScore,
        uint256 amount,
        uint32 term,
        bytes calldata inputProof
    ) external {
        require(amount > 0, "Amount must be greater than 0");
        require(term > 0 && term <= 120, "Term must be between 1-120 months");

        euint32 score = FHE.fromExternal(encryptedScore, inputProof);

        // Set ACL permissions: allow contract and borrower to decrypt
        // Note: In production, you may want to add a function to allow specific lenders
        FHE.allowThis(score);
        FHE.allow(score, msg.sender); // Allow borrower to decrypt

        BorrowerRequest memory request = BorrowerRequest({
            borrower: msg.sender,
            encryptedScore: score,
            amount: amount,
            term: term,
            isActive: true
        });

        borrowerRequests.push(request);
        uint256 requestId = borrowerRequests.length - 1;

        emit NewBorrowerRequest(requestId, msg.sender, amount);
    }

    /// @notice Find matching borrower requests based on minimum credit score threshold
    /// @param _minScore The minimum credit score threshold (plain text)
    /// @return matchingRequestIds Array of matching borrower request IDs
    /// @dev Returns all active requests. Use checkScoreMatch() for FHE comparison filtering.
    function findMatches(uint32 _minScore) external view returns (uint256[] memory matchingRequestIds) {
        // Suppress unused parameter warning - filtering is done via checkScoreMatch
        _minScore;
        
        uint256[] memory tempMatches = new uint256[](borrowerRequests.length);
        uint256 matchCount = 0;

        for (uint256 i = 0; i < borrowerRequests.length; i++) {
            if (borrowerRequests[i].isActive) {
                tempMatches[matchCount] = i;
                matchCount++;
            }
        }

        // Resize array to actual match count
        matchingRequestIds = new uint256[](matchCount);
        for (uint256 j = 0; j < matchCount; j++) {
            matchingRequestIds[j] = tempMatches[j];
        }

        return matchingRequestIds;
    }

    /// @notice Check if a borrower request's encrypted score meets minimum threshold using FHE comparison
    /// @param requestId The request ID
    /// @param minScore The minimum credit score threshold (plain text)
    /// @return ebool The encrypted comparison result (encryptedScore >= minScore)
    /// @dev This allows anyone to check if a score matches without decrypting the actual score.
    ///      Only the comparison result (true/false) can be decrypted, not the score itself.
    ///      Note: This function cannot be view because FHE operations modify state (FHEVM requirement).
    function checkScoreMatch(uint256 requestId, uint32 minScore) 
        external returns (ebool) {
        require(requestId < borrowerRequests.length, "Invalid request ID");
        
        BorrowerRequest storage request = borrowerRequests[requestId];
        require(request.isActive, "Request is not active");
        
        // Encrypt the minScore to euint32 for comparison
        euint32 minScoreEncrypted = FHE.asEuint32(minScore);
        
        // Perform homomorphic comparison: encryptedScore >= minScoreEncrypted
        // This returns an encrypted boolean (ebool) - the result is still encrypted!
        // Note: FHE.ge() means greater or equal, FHE.gt() means greater than
        ebool comparisonResult = FHE.ge(request.encryptedScore, minScoreEncrypted);
        
        // Store the comparison result for the caller
        comparisonResults[requestId][minScore][msg.sender] = comparisonResult;
        
        // Allow contract to decrypt the comparison result
        FHE.allowThis(comparisonResult);
        // Allow the caller (lender) to decrypt the comparison result
        // This enables external users to decrypt the boolean result without decrypting the actual score
        FHE.allow(comparisonResult, msg.sender);
        
        return comparisonResult;
    }
    
    /// @notice Get stored comparison result for a request
    /// @param requestId The request ID
    /// @param minScore The minimum score threshold  
    /// @param caller The address that called checkScoreMatch
    /// @return The stored encrypted comparison result (ebool)
    function getComparisonResult(uint256 requestId, uint32 minScore, address caller) 
        external view returns (ebool) {
        return comparisonResults[requestId][minScore][caller];
    }
    
    /// @notice Get encrypted score for a borrower request (for testing/decryption)
    /// @param requestId The request ID
    /// @return The encrypted score handle
    function getEncryptedScore(uint256 requestId) external view returns (euint32) {
        require(requestId < borrowerRequests.length, "Invalid request ID");
        return borrowerRequests[requestId].encryptedScore;
    }

    /// @notice Submit a lender offer for a specific borrower request
    /// @param borrowerRequestId The ID of the borrower request
    /// @param amount The offered loan amount in wei
    /// @param apr The annual percentage rate in basis points (e.g., 500 = 5%)
    /// @param term The loan term in months
    function submitLenderOffer(
        uint256 borrowerRequestId,
        uint256 amount,
        uint32 apr,
        uint32 term
    ) external {
        require(borrowerRequestId < borrowerRequests.length, "Invalid request ID");
        require(borrowerRequests[borrowerRequestId].isActive, "Request is not active");
        require(amount > 0, "Amount must be greater than 0");
        require(apr > 0 && apr <= 10000, "APR must be between 1-10000 basis points");
        require(term > 0 && term <= 120, "Term must be between 1-120 months");

        LenderOffer memory offer = LenderOffer({
            lender: msg.sender,
            borrowerRequestId: borrowerRequestId,
            amount: amount,
            apr: apr,
            term: term,
            isActive: true
        });

        lenderOffers.push(offer);
        uint256 offerId = lenderOffers.length - 1;

        emit NewLenderOffer(offerId, borrowerRequestId, msg.sender, amount);
    }

    /// @notice Accept a lender offer and create a loan
    /// @param offerId The ID of the lender offer to accept
    function acceptLoanOffer(uint256 offerId) external payable {
        require(offerId < lenderOffers.length, "Invalid offer ID");
        LenderOffer storage offer = lenderOffers[offerId];
        require(offer.isActive, "Offer is not active");

        BorrowerRequest storage request = borrowerRequests[offer.borrowerRequestId];
        require(request.isActive, "Borrower request is not active");
        require(request.borrower == msg.sender, "Only borrower can accept offer");
        require(msg.value == 0, "Do not send ETH directly"); // We'll use ERC20 in production

        // In production, this would transfer ERC20 tokens
        // For MVP, we'll simulate the transfer

        // Create the loan
        Loan memory loan = Loan({
            borrower: request.borrower,
            lender: offer.lender,
            amount: offer.amount,
            apr: offer.apr,
            term: offer.term,
            startTime: uint32(block.timestamp),
            isActive: true,
            isRepaid: false
        });

        loans.push(loan);
        uint256 loanId = loans.length - 1;

        // Deactivate the request and offer
        request.isActive = false;
        offer.isActive = false;

        // Transfer funds (simulated - in production would use ERC20)
        // payable(request.borrower).transfer(offer.amount);

        emit LoanCreated(loanId, request.borrower, offer.lender, offer.amount);
    }

    /// @notice Get borrower requests count
    /// @return The total number of borrower requests
    function getBorrowerRequestsCount() external view returns (uint256) {
        return borrowerRequests.length;
    }

    /// @notice Get lender offers count
    /// @return The total number of lender offers
    function getLenderOffersCount() external view returns (uint256) {
        return lenderOffers.length;
    }

    /// @notice Get loans count
    /// @return The total number of loans
    function getLoansCount() external view returns (uint256) {
        return loans.length;
    }

    /// @notice Get borrower request details (without encrypted score)
    /// @param requestId The request ID
    /// @return borrower The borrower address
    /// @return amount The requested amount
    /// @return term The loan term
    /// @return isActive Whether the request is active
    function getBorrowerRequest(uint256 requestId) external view returns (
        address borrower,
        uint256 amount,
        uint32 term,
        bool isActive
    ) {
        require(requestId < borrowerRequests.length, "Invalid request ID");
        BorrowerRequest storage request = borrowerRequests[requestId];
        return (request.borrower, request.amount, request.term, request.isActive);
    }

    /// @notice Get lender offer details
    /// @param offerId The offer ID
    /// @return lender The lender address
    /// @return borrowerRequestId The borrower request ID
    /// @return amount The offered amount
    /// @return apr The APR in basis points
    /// @return term The loan term
    /// @return isActive Whether the offer is active
    function getLenderOffer(uint256 offerId) external view returns (
        address lender,
        uint256 borrowerRequestId,
        uint256 amount,
        uint32 apr,
        uint32 term,
        bool isActive
    ) {
        require(offerId < lenderOffers.length, "Invalid offer ID");
        LenderOffer storage offer = lenderOffers[offerId];
        return (offer.lender, offer.borrowerRequestId, offer.amount, offer.apr, offer.term, offer.isActive);
    }

    /// @notice Get loan details
    /// @param loanId The loan ID
    /// @return borrower The borrower address
    /// @return lender The lender address
    /// @return amount The loan amount
    /// @return apr The APR in basis points
    /// @return term The loan term
    /// @return startTime The loan start timestamp
    /// @return isActive Whether the loan is active
    /// @return isRepaid Whether the loan is repaid
    function getLoan(uint256 loanId) external view returns (
        address borrower,
        address lender,
        uint256 amount,
        uint32 apr,
        uint32 term,
        uint32 startTime,
        bool isActive,
        bool isRepaid
    ) {
        require(loanId < loans.length, "Invalid loan ID");
        Loan storage loan = loans[loanId];
        return (loan.borrower, loan.lender, loan.amount, loan.apr, loan.term, loan.startTime, loan.isActive, loan.isRepaid);
    }
}
