import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { toast } from "sonner";
import { useCipherLending } from "@/hooks/useCipherLending";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";

interface LoanDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: {
    lender: string;
    lenderFull: string;
    rate: string;
    amount: string;
    amountWei?: bigint; // Add amount in wei for contract calls
    term: string;
    encrypted: boolean;
    offerId: bigint;
  };
  offerId: bigint;
}

const LoanDetailsDialog = ({ open, onOpenChange, offer }: LoanDetailsDialogProps) => {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { acceptLoanOffer } = useCipherLending();
  const { addTransaction, updateTransaction } = useTransactionHistory();
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsAccepting(true);
    let txId: string | undefined;

    try {
      // Record transaction start
      txId = addTransaction({
        type: 'accept_offer',
        status: 'pending',
        details: {
          offerId: offer.offerId,
          lender: offer.lenderFull || offer.lender,
          amount: offer.amount,
          apr: parseFloat(offer.rate.replace('%', '')),
          term: parseInt(offer.term.replace(' months', '')),
        },
      });

      toast.info("Please confirm the transaction in your wallet...");

      // Accept the loan offer
      const hash = await acceptLoanOffer(offer.offerId);

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
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // Update transaction status
        if (txId) {
          updateTransaction(txId, {
            status: 'success',
            txHash: hash,
          });
        }

        toast.success("Loan offer accepted successfully! The loan has been created.");
        onOpenChange(false);
      } else {
        toast.success("Transaction submitted! Waiting for confirmation...");
        if (txId) {
          updateTransaction(txId, {
            status: 'success',
            txHash: hash,
          });
        }
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error("Error accepting offer:", error);
      
      // Handle user rejection
      if (error?.message?.includes("User rejected") || error?.message?.includes("User denied")) {
        toast.error("Transaction was rejected. Please try again.");
      } else {
        toast.error(error?.message || "Failed to accept loan offer");
      }
      
      if (txId) {
        updateTransaction(txId, {
          status: 'failed',
          error: error?.message || "Unknown error",
        });
      }
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Loan Offer Details</DialogTitle>
          <DialogDescription>
            Review the encrypted loan offer details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-900">Encrypted Offer</span>
            </div>
            <p className="text-sm text-blue-700">
              This offer was matched using Fully Homomorphic Encryption. The lender never sees your actual credit score.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Lender</span>
              <span className="text-sm font-medium">{offer.lender}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">APR</span>
              <span className="text-lg font-bold text-blue-600">{offer.rate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Loan Amount</span>
              <span className="text-sm font-semibold">{offer.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Term</span>
              <span className="text-sm font-semibold">{offer.term}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              className="flex-1 bg-gradient-to-r from-blue-600 to-teal-500 hover:opacity-90"
              onClick={handleAccept}
              disabled={isAccepting}
            >
              {isAccepting ? (
                <>
                  <span className="mr-2">Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Accept Offer
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isAccepting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoanDetailsDialog;

