import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { useAccount, useChainId } from "wagmi";
import { Clock, CheckCircle, XCircle, Loader2, Trash2, ExternalLink } from "lucide-react";
import { formatEther } from "viem";

const TransactionHistory = () => {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { transactions, clearHistory, formatTransaction } = useTransactionHistory();

  if (!isConnected || !address) {
    return (
      <Card className="p-8 text-center bg-gradient-to-br from-gray-50 to-white">
        <p className="text-muted-foreground">
          Please connect your wallet to view transaction history
        </p>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="p-8 text-center bg-gradient-to-br from-gray-50 to-white">
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-2">No transaction history yet</p>
        <p className="text-sm text-muted-foreground">
          Your transactions will appear here once you start using the platform
        </p>
      </Card>
    );
  }

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />;
    }
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const getExplorerUrl = (txHash?: string) => {
    if (!txHash) return null;
    // This will work for most networks - adjust chainId if needed
    if (chainId === 1) {
      return `https://etherscan.io/tx/${txHash}`;
    } else if (chainId === 11155111) {
      return `https://sepolia.etherscan.io/tx/${txHash}`;
    } else if (chainId === 31337) {
      return null; // Local network
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold">Transaction History</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        {transactions.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearHistory}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear History
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {transactions.map((tx) => {
          const formatted = formatTransaction(tx);
          const explorerUrl = getExplorerUrl(tx.txHash);

          return (
            <Card
              key={tx.id}
              className={`p-4 border-2 transition-all hover:shadow-md ${getStatusColor(tx.status)}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{formatted.icon}</span>
                    <h4 className="font-semibold">{formatted.title}</h4>
                    {getStatusIcon(tx.status)}
                  </div>
                  
                  <p className="text-sm mb-2">{formatted.description}</p>
                  
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatted.formattedDate}
                    </span>
                    {tx.details.requestId !== undefined && (
                      <span>Request ID: {tx.details.requestId.toString()}</span>
                    )}
                    {tx.details.offerId !== undefined && (
                      <span>Offer ID: {tx.details.offerId.toString()}</span>
                    )}
                  </div>

                  {tx.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      Error: {tx.error}
                    </div>
                  )}
                </div>

                {explorerUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="flex-shrink-0"
                  >
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View
                    </a>
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TransactionHistory;

