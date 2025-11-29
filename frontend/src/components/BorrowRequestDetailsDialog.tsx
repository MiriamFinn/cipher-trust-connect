import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, TrendingUp } from "lucide-react";

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
  const handleMakeOffer = () => {
    // TODO: Implement make offer logic
    console.log("Making offer for request:", request);
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BorrowRequestDetailsDialog;

