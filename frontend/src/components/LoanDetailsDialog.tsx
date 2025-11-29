import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle } from "lucide-react";

interface LoanDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: {
    lender: string;
    lenderFull: string;
    rate: string;
    amount: string;
    term: string;
    encrypted: boolean;
    offerId: bigint;
  };
  offerId: bigint;
}

const LoanDetailsDialog = ({ open, onOpenChange, offer }: LoanDetailsDialogProps) => {
  const handleAccept = () => {
    // TODO: Implement accept offer logic
    console.log("Accepting offer:", offer);
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
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Accept Offer
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
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

