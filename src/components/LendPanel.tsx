import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, Lock } from "lucide-react";
import { useState } from "react";

const LendPanel = () => {
  const [investAmount, setInvestAmount] = useState([10000]);
  const [minScore, setMinScore] = useState([650]);

  const borrowRequests = [
    { id: "B-001", encryptedScore: "***", amount: "$8,500", term: "18 months", risk: "Medium" },
    { id: "B-002", encryptedScore: "***", amount: "$12,000", term: "24 months", risk: "Low" },
    { id: "B-003", encryptedScore: "***", amount: "$6,000", term: "12 months", risk: "Medium" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6 bg-gradient-card shadow-card">
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
              <span className="text-lg font-bold text-secondary">${investAmount[0].toLocaleString()}</span>
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
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium flex items-center gap-2">
                Minimum Encrypted Score
                <Lock className="h-4 w-4 text-encrypted" />
              </label>
              <span className="text-lg font-bold text-encrypted">{minScore[0]}</span>
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
          </div>

          <div className="rounded-lg bg-secondary/5 p-4 border border-secondary/20">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-secondary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Secure Matching</p>
                <p className="text-muted-foreground">
                  All borrower data is encrypted. Risk assessment happens on encrypted values.
                </p>
              </div>
            </div>
          </div>

          <Button className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" size="lg">
            <TrendingUp className="mr-2 h-5 w-5" />
            Start Lending
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold mb-4">Matching Requests</h3>
        {borrowRequests.map((request) => (
          <Card key={request.id} className="p-5 bg-gradient-card shadow-card hover:shadow-glow transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">Request {request.id}</h4>
                  <Lock className="h-4 w-4 text-encrypted" />
                </div>
                <p className="text-sm text-muted-foreground">Encrypted borrower profile</p>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-medium ${
                request.risk === "Low" 
                  ? "bg-accent/10 text-accent" 
                  : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500"
              }`}>
                {request.risk} Risk
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Score</p>
                <p className="font-semibold text-encrypted">{request.encryptedScore}</p>
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
              <Button variant="outline" className="flex-1 border-secondary text-secondary hover:bg-secondary/10">
                Make Offer
              </Button>
              <Button variant="outline" className="flex-1">
                Details
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LendPanel;
