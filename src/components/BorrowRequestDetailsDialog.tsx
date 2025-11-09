import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Shield } from "lucide-react";
import { useState } from "react";

interface BorrowRequestDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: {
    id: string;
    encryptedScore: string;
    amount: string;
    term: string;
    risk: string;
  };
}

const BorrowRequestDetailsDialog = ({ open, onOpenChange, request }: BorrowRequestDetailsDialogProps) => {
  const [offerRate, setOfferRate] = useState("5.5");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Borrow Request {request.id}
            <Lock className="h-4 w-4 text-encrypted" />
          </DialogTitle>
          <DialogDescription>
            Review encrypted borrower profile and make an offer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-lg bg-gradient-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Encrypted Score</span>
              <span className="text-2xl font-bold text-encrypted">{request.encryptedScore}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Requested Amount</span>
              <span className="text-xl font-semibold">{request.amount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Loan Term</span>
              <span className="text-lg font-medium">{request.term}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Risk Level</span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                request.risk === "Low" 
                  ? "bg-accent/10 text-accent" 
                  : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500"
              }`}>
                {request.risk} Risk
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-secondary/5 border border-secondary/20 p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-secondary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Encrypted Assessment</p>
                <p className="text-muted-foreground">
                  Risk level calculated on encrypted data. Borrower identity remains private.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="offer-rate">Your Offer Rate (APR %)</Label>
            <Input
              id="offer-rate"
              type="number"
              step="0.1"
              value={offerRate}
              onChange={(e) => setOfferRate(e.target.value)}
              placeholder="5.5"
            />
            <p className="text-xs text-muted-foreground">
              Suggested rate based on encrypted risk assessment: 5.2% - 6.0%
            </p>
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
                // Handle submit offer logic
              }}
            >
              Submit Offer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BorrowRequestDetailsDialog;
