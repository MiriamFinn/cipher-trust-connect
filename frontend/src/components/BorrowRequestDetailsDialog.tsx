import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { toast } from "sonner";
import { parseEther } from "viem";
import { useCipherLending } from "@/hooks/useCipherLending";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";

interface BorrowerRequest {
  id: string;
  requestId: number;
  borrower: string;
  encryptedScore: string;
  amount: string;
  amountWei: bigint;
  term: string;
  termMonths: number;
  risk: "Low" | "Medium" | "High";
  isActive: boolean;
}

interface BorrowRequestDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: BorrowerRequest;
}

const BorrowRequestDetailsDialog = ({ open, onOpenChange, request }: BorrowRequestDetailsDialogProps) => {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { submitLenderOffer } = useCipherLending();
  const { addTransaction, updateTransaction } = useTransactionHistory();
  
  // Form state
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerApr, setOfferApr] = useState("5.0"); // Default 5% APR
  const [offerTerm, setOfferTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with request values when dialog opens
  useEffect(() => {
    if (open && request && !showOfferForm) {
      const requestAmountEth = parseFloat(request.amount.replace(/[^0-9.]/g, ""));
      setOfferAmount(requestAmountEth.toString());
      setOfferTerm(request.termMonths.toString());
    }
    
    // Reset form when dialog closes
    if (!open) {
      setShowOfferForm(false);
      setOfferAmount("");
      setOfferApr("5.0");
      setOfferTerm("");
    }
  }, [open, request, showOfferForm]);

  const handleMakeOffer = () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    if (!request.isActive) {
      toast.error("This request is no longer active");
      return;
    }
    setShowOfferForm(true);
  };

  const handleSubmitOffer = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    // Validate inputs
    const amount = parseFloat(offerAmount);
    const apr = parseFloat(offerApr);
    const term = parseInt(offerTerm);

    if (!amount || amount <= 0) {
      toast.error("Please enter a valid offer amount");
      return;
    }

    if (!apr || apr <= 0 || apr > 100) {
      toast.error("Please enter a valid APR (0-100%)");
      return;
    }

    if (!term || term <= 0) {
      toast.error("Please enter a valid term in months");
      return;
    }

    // Convert APR percentage to basis points (e.g., 5% = 500 basis points)
    const aprBasisPoints = Math.round(apr * 100);

    setIsSubmitting(true);
    let txId: string | undefined;

    try {
      // Record transaction start
      txId = addTransaction({
        type: 'lender_offer',
        status: 'pending',
        details: {
          requestId: BigInt(request.requestId),
          amount: `$${amount.toLocaleString()}`,
          apr: apr, // Store as number, not string
          term: term,
        },
      });

      // Convert amount to wei
      const amountWei = parseEther(amount.toString());

      // Submit offer to contract
      const hash = await submitLenderOffer(
        BigInt(request.requestId),
        amountWei,
        aprBasisPoints,
        term
      );

      if (!hash) {
        throw new Error("Transaction failed");
      }

      // Update transaction with hash
      if (txId) {
        updateTransaction(txId, {
          txHash: hash,
        });
      }

      // Wait for transaction confirmation
      if (publicClient) {
        toast.info("Transaction submitted! Waiting for confirmation...");
        await publicClient.waitForTransactionReceipt({ hash });
      }

      // Update transaction status
      if (txId) {
        updateTransaction(txId, {
          status: 'success',
          txHash: hash,
        });
      }

      toast.success("Offer submitted successfully!");
      setShowOfferForm(false);
      onOpenChange(false);
      
      // Reset form
      setOfferAmount("");
      setOfferApr("5.0");
      setOfferTerm("");
    } catch (error: any) {
      console.error("Error submitting offer:", error);
      toast.error(error?.message || "Failed to submit offer");
      
      if (txId) {
        updateTransaction(txId, {
          status: 'failed',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const riskColor = {
    Low: "bg-green-100 text-green-700",
    Medium: "bg-yellow-100 text-yellow-700",
    High: "bg-red-100 text-red-700",
  }[request.risk];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Borrower Request Details</DialogTitle>
          <DialogDescription>
            Review the encrypted borrower request details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-teal-50 p-4 border border-teal-200">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-5 w-5 text-teal-600" />
              <span className="font-semibold text-teal-900">Encrypted Request</span>
            </div>
            <p className="text-sm text-teal-700">
              All borrower information is encrypted. You only see risk assessment based on encrypted computations.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Request ID</span>
              <span className="text-sm font-medium">{request.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Encrypted Score</span>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-600">{request.encryptedScore}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Loan Amount</span>
              <span className="text-sm font-semibold">{request.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Term</span>
              <span className="text-sm font-semibold">{request.term}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Risk Level</span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${riskColor}`}>
                {request.risk} Risk
              </span>
            </div>
          </div>

          {!showOfferForm ? (
            <div className="flex gap-2 pt-4">
              <Button
                className="flex-1 bg-gradient-to-r from-teal-600 to-blue-500 hover:opacity-90"
                onClick={handleMakeOffer}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Make Offer
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <h4 className="text-sm font-semibold mb-3">Submit Your Offer</h4>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="offerAmount" className="text-sm font-medium">
                    Offer Amount (USD)
                  </Label>
                  <input
                    id="offerAmount"
                    type="number"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum: {request.amount}
                  </p>
                </div>

                <div>
                  <Label htmlFor="offerApr" className="text-sm font-medium">
                    Annual Percentage Rate (APR %)
                  </Label>
                  <input
                    id="offerApr"
                    type="number"
                    value={offerApr}
                    onChange={(e) => setOfferApr(e.target.value)}
                    placeholder="5.0"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter APR as percentage (e.g., 5.0 for 5%)
                  </p>
                </div>

                <div>
                  <Label htmlFor="offerTerm" className="text-sm font-medium">
                    Term (Months)
                  </Label>
                  <input
                    id="offerTerm"
                    type="number"
                    value={offerTerm}
                    onChange={(e) => setOfferTerm(e.target.value)}
                    placeholder="Enter term in months"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    min="1"
                    step="1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Borrower requested: {request.term}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 bg-gradient-to-r from-teal-600 to-blue-500 hover:opacity-90"
                  onClick={handleSubmitOffer}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="mr-2">Submitting...</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Submit Offer
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowOfferForm(false);
                    setOfferAmount("");
                    setOfferApr("5.0");
                    setOfferTerm("");
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BorrowRequestDetailsDialog;

