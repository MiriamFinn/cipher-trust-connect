import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Lock, TrendingUp, Clock } from "lucide-react";
import { useState } from "react";

const BorrowPanel = () => {
  const [loanAmount, setLoanAmount] = useState([5000]);
  const [encryptedScore] = useState(750); // Encrypted value

  const offers = [
    { lender: "Lender A", rate: "5.2%", amount: "$5,000", term: "12 months", encrypted: true },
    { lender: "Lender B", rate: "5.8%", amount: "$5,000", term: "12 months", encrypted: true },
    { lender: "Lender C", rate: "6.1%", amount: "$5,000", term: "12 months", encrypted: true },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6 bg-gradient-card shadow-card">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold">Your Encrypted Score</h3>
            <Lock className="h-5 w-5 text-encrypted" />
          </div>
          <div className="text-4xl font-bold text-encrypted mb-2">***</div>
          <p className="text-sm text-muted-foreground">Actual Score: {encryptedScore} (Only visible to you)</p>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Loan Amount</label>
              <span className="text-lg font-bold text-primary">${loanAmount[0].toLocaleString()}</span>
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

          <div className="rounded-lg bg-primary/5 p-4 border border-primary/20">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Encrypted Matching</p>
                <p className="text-muted-foreground">
                  Lenders see encrypted data only. Your score is protected by FHE computation.
                </p>
              </div>
            </div>
          </div>

          <Button className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" size="lg">
            <TrendingUp className="mr-2 h-5 w-5" />
            Request Loan Offers
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold mb-4">Available Offers</h3>
        {offers.map((offer, index) => (
          <Card key={index} className="p-5 bg-gradient-card shadow-card hover:shadow-glow transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">{offer.lender}</h4>
                  {offer.encrypted && <Lock className="h-4 w-4 text-encrypted" />}
                </div>
                <p className="text-sm text-muted-foreground">Matched via encrypted scoring</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{offer.rate}</div>
                <p className="text-xs text-muted-foreground">APR</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Amount</p>
                <p className="font-semibold">{offer.amount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Term</p>
                <p className="font-semibold flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {offer.term}
                </p>
              </div>
            </div>

            <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
              View Details
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BorrowPanel;
