import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Clock, TrendingUp } from "lucide-react";

interface LoanDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: {
    lender: string;
    rate: string;
    amount: string;
    term: string;
    encrypted: boolean;
  };
}

const LoanDetailsDialog = ({ open, onOpenChange, offer }: LoanDetailsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Loan Offer Details
            {offer.encrypted && <Lock className="h-4 w-4 text-encrypted" />}
          </DialogTitle>
          <DialogDescription>
            Review the complete loan offer from {offer.lender}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-lg bg-gradient-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">APR Rate</span>
              <span className="text-2xl font-bold text-primary">{offer.rate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Loan Amount</span>
              <span className="text-xl font-semibold">{offer.amount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Term Length</span>
              <span className="text-lg font-medium flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {offer.term}
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Privacy Protected</p>
                <p className="text-muted-foreground">
                  This offer was generated using encrypted credit scoring. Your actual score remains hidden.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Loan Terms</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• No prepayment penalties</li>
              <li>• Fixed interest rate guaranteed</li>
              <li>• Automated encrypted payment processing</li>
              <li>• Full privacy throughout loan term</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-gradient-primary hover:opacity-90"
              onClick={() => {
                onOpenChange(false);
                // Handle accept loan logic
              }}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Accept Offer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoanDetailsDialog;
