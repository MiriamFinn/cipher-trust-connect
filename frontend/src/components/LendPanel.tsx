import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { useCipherLending } from "@/hooks/useCipherLending";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import BorrowRequestDetailsDialog from "./BorrowRequestDetailsDialog";
import { formatEther } from "viem";

interface BorrowerRequest {
  id: string;
  requestId: number;
  borrower: string;
  encryptedScore: string;
  amount: string; // Formatted amount for display
  amountWei: bigint; // Raw amount in wei for contract calls
  term: string;
  termMonths: number; // Raw term in months for contract calls
  risk: "Low" | "Medium" | "High";
  isActive: boolean;
  wasDecrypted?: boolean; // Track if score was decrypted for filtering
}

const LendPanel = () => {
  const { isConnected } = useAccount();
  const { findEncryptedMatches, getBorrowerRequest, checkScoreMatch } = useCipherLending();
  const { addTransaction, updateTransaction } = useTransactionHistory();
  const [investAmount, setInvestAmount] = useState([10000]);
  const [minScore, setMinScore] = useState([650]);
  const [selectedRequest, setSelectedRequest] = useState<BorrowerRequest | null>(null);
  const [borrowRequests, setBorrowRequests] = useState<BorrowerRequest[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by only rendering dynamic content after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleStartLending = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsSearching(true);
    let txId: string | undefined;

    try {
      // Record transaction start
      txId = addTransaction({
        type: 'match_search',
        status: 'pending',
        details: {
          minScore: minScore[0],
          amount: `$${investAmount[0].toLocaleString()}`,
        },
      });

      // 1. Find matching request IDs from contract
      const matchingRequestIds = await findEncryptedMatches(minScore[0]);
      
      if (!matchingRequestIds || matchingRequestIds.length === 0) {
        setBorrowRequests([]);
        setShowRequests(true);
        toast.info("No matching borrower requests found. Try adjusting your minimum score.");
        return;
      }

      // 2. Fetch details for each matching request and decrypt scores
      const requests = await Promise.all(
        matchingRequestIds.map(async (requestIdBigInt) => {
          const requestId = Number(requestIdBigInt);
          try {
            // Get request details (borrower, amount, term, isActive)
            const [borrower, amount, term, isActive] = await getBorrowerRequest(requestIdBigInt);
            
            // Filter by Investment Amount: only show requests with amount <= investAmount
            const amountInDollars = parseFloat(formatEther(amount));
            if (amountInDollars > investAmount[0]) {
              // Skip requests that exceed investment amount
              return null;
            }
            
            // Use FHE homomorphic comparison to check if score >= minScore
            // This only decrypts the comparison result (boolean), NOT the actual score
            let risk: "Low" | "Medium" | "High" = "Medium";
            
            try {
              console.log(`[LendPanel] Checking score match for request ${requestId}, minScore: ${minScore[0]}`);
              toast.info(`Checking score for request ${requestId}... (This requires a transaction)`);
              const matchResult = await checkScoreMatch(requestIdBigInt, minScore[0]);
              console.log(`[LendPanel] checkScoreMatch returned for request ${requestId}:`, matchResult);
              
              if (matchResult === false) {
                // Score doesn't meet minimum requirement - skip this request
                console.log(`[LendPanel] Request ${requestId} filtered out: score < ${minScore[0]}`);
                return null;
              } else if (matchResult === true) {
                // Score meets requirement
                console.log(`[LendPanel] ✅ Request ${requestId} passed FHE comparison: score >= ${minScore[0]}`);
                // Use a default risk level based on minScore
                if (minScore[0] >= 750) {
                  risk = "Low";
                } else if (minScore[0] >= 650) {
                  risk = "Medium";
                } else {
                  risk = "High";
                }
              } else {
                // Comparison failed (null) - do not show request for safety
                console.error(`[LendPanel] ⚠️ FHE comparison failed for request ${requestId}. Skipping request.`);
                console.error(`[LendPanel]    This may indicate:`);
                console.error(`[LendPanel]    1. Contract not redeployed with checkScoreMatch function`);
                console.error(`[LendPanel]    2. FHEVM not ready or configuration issue`);
                console.error(`[LendPanel]    3. Decryption permission issue`);
                console.error(`[LendPanel]    4. simulateContract call failed`);
                return null; // Do not show requests when comparison fails
              }
            } catch (error) {
              console.error(`[LendPanel] ❌ Error checking score match for request ${requestId}:`, error);
              // Do not show requests when comparison fails
              return null;
            }
            
            // Format amount for display (already calculated above)
            const amountInDollarsFormatted = amountInDollars.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });

            return {
              id: `B-${requestId.toString().padStart(3, '0')}`,
              requestId,
              borrower: borrower as string,
              encryptedScore: "***", // Always encrypted - never show actual score for privacy
              amount: amountInDollarsFormatted,
              amountWei: amount, // Store raw amount for contract calls
              term: `${term} months`,
              termMonths: term, // Store raw term for contract calls
              risk,
              isActive,
              wasDecrypted: false, // We never decrypt the score, only the comparison result
            } as BorrowerRequest;
          } catch (error) {
            console.error(`Error fetching request ${requestId}:`, error);
            // Return a placeholder for failed requests (will be filtered out)
            return {
              id: `B-${requestId.toString().padStart(3, '0')}`,
              requestId,
              borrower: "Unknown",
              encryptedScore: "***",
              amount: "$0",
              amountWei: BigInt(0),
              term: "0 months",
              termMonths: 0,
              risk: "Medium" as const,
              isActive: false,
            } as BorrowerRequest;
          }
        })
      );

      // 3. Filter out null requests (filtered by score/amount) and inactive requests
      const validRequests = requests.filter(req => req !== null) as BorrowerRequest[];
      const activeRequests = validRequests.filter(req => req.isActive);
      
      // Count filtered requests
      const totalRequested = matchingRequestIds.length;
      const filteredCount = totalRequested - activeRequests.length;

      // 4. Update state with real data
      setBorrowRequests(activeRequests);
      setShowRequests(true);
      
      // Update transaction status
      if (txId) {
        updateTransaction(txId, {
          status: 'success',
          details: {
            minScore: minScore[0],
            amount: `$${investAmount[0].toLocaleString()}`,
          },
        });
      }
      
      if (activeRequests.length > 0) {
        let message = `Found ${activeRequests.length} matching borrower request${activeRequests.length > 1 ? 's' : ''}!`;
        if (filteredCount > 0) {
          message += ` (${filteredCount} request${filteredCount > 1 ? 's' : ''} filtered out by your criteria)`;
        }
        toast.success(message);
      } else {
        if (totalRequested > 0) {
          toast.info(`All ${totalRequested} request${totalRequested > 1 ? 's' : ''} were filtered out. Try adjusting your minimum score (${minScore[0]}) or investment amount ($${investAmount[0].toLocaleString()}).`);
        } else {
          toast.info("No active matching requests found. Try adjusting your criteria.");
        }
      }
    } catch (error) {
      console.error("Error finding matches:", error);
      
      // Update transaction status to failed
      if (txId) {
        updateTransaction(txId, {
          status: 'failed',
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
      
      toast.error("Failed to find matches. Please try again.");
      setBorrowRequests([]);
      setShowRequests(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMakeOffer = (request: BorrowerRequest) => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    if (!request.isActive) {
      toast.error("This request is no longer active");
      return;
    }
    setSelectedRequest(request);
  };

  const handleViewDetails = (request: BorrowerRequest) => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    setSelectedRequest(request);
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 bg-gradient-to-br from-teal-50 to-white shadow-sm">
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Set Your Parameters</h3>
            <p className="text-sm text-muted-foreground">
              Define your lending criteria with privacy-preserving filters
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Investment Amount</label>
                <span className="text-lg font-bold text-teal-600">${investAmount[0].toLocaleString()}</span>
              </div>
              <Slider
                value={investAmount}
                onValueChange={setInvestAmount}
                max={100000}
                min={5000}
                step={1000}
                className="mb-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>$5,000</span>
                <span>$100,000</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Only show requests with loan amount ≤ your investment amount
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  Minimum Encrypted Score
                  <Lock className="h-4 w-4 text-purple-600" />
                </label>
                <span className="text-lg font-bold text-purple-600">{minScore[0]}</span>
              </div>
              <Slider
                value={minScore}
                onValueChange={setMinScore}
                max={850}
                min={300}
                step={10}
                className="mb-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>300</span>
                <span>850</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Only show requests with credit score ≥ minimum (using FHE comparison - score never decrypted)
              </p>
            </div>

            <div className="rounded-lg bg-teal-50 p-4 border border-teal-200">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-teal-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Secure Matching</p>
                  <p className="text-muted-foreground">
                    All borrower data is encrypted. Risk assessment happens on encrypted values.
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-teal-600 to-blue-500 hover:opacity-90 transition-opacity"
              size="lg"
              onClick={handleStartLending}
              disabled={isSearching}
            >
              <TrendingUp className="mr-2 h-5 w-5" />
              {isSearching ? "Searching..." : "Start Lending"}
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold mb-4">Matching Requests</h3>
          {!showRequests && (
            <Card className="p-8 text-center bg-gradient-to-br from-gray-50 to-white">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Set your parameters and start lending to see encrypted borrower matches
              </p>
            </Card>
          )}
          {isMounted && showRequests && borrowRequests.length === 0 && (
            <Card className="p-8 text-center bg-gradient-to-br from-gray-50 to-white">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No matching borrower requests found. Try adjusting your minimum score or check back later.
              </p>
            </Card>
          )}
          {isMounted && showRequests && borrowRequests.length > 0 && (
            borrowRequests.map((request) => (
              <Card key={request.id} className="p-5 bg-gradient-to-br from-white to-teal-50 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">Request {request.id}</h4>
                      <Lock className="h-4 w-4 text-purple-600" />
                    </div>
                    <p className="text-sm text-muted-foreground">Encrypted borrower profile</p>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-medium ${
                    request.risk === "Low"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {request.risk} Risk
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Score</p>
                    <p className="font-semibold text-purple-600">{request.encryptedScore}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Amount</p>
                    <p className="font-semibold">{request.amount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Term</p>
                    <p className="font-semibold">{request.term}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-teal-600 text-teal-600 hover:bg-teal-50"
                    onClick={() => handleMakeOffer(request)}
                  >
                    Make Offer
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleViewDetails(request)}
                  >
                    Details
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {selectedRequest && (
        <BorrowRequestDetailsDialog
          open={!!selectedRequest}
          onOpenChange={(open) => !open && setSelectedRequest(null)}
          request={selectedRequest}
        />
      )}
    </>
  );
};

export default LendPanel;

