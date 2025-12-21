import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';

export type TransactionType = 
  | 'borrow_request'
  | 'lender_offer'
  | 'accept_offer'
  | 'loan_accepted'
  | 'match_search';

export interface Transaction {
  id: string;
  type: TransactionType;
  timestamp: number;
  txHash?: string;
  status: 'pending' | 'success' | 'failed';
  details: {
    amount?: string;
    amountWei?: bigint;
    term?: number;
    apr?: number;
    requestId?: bigint;
    offerId?: bigint;
    borrower?: string;
    lender?: string;
    minScore?: number;
    creditScore?: number;
  };
  error?: string;
}

const STORAGE_KEY_PREFIX = 'cipher_trust_transactions_';

export const useTransactionHistory = () => {
  const { address } = useAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Load transactions from localStorage on mount or address change
  useEffect(() => {
    if (!address) {
      setTransactions([]);
      return;
    }

    try {
      const key = `${STORAGE_KEY_PREFIX}${address.toLowerCase()}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert bigint strings back to numbers for display
        const converted = parsed.map((tx: any) => ({
          ...tx,
          details: {
            ...tx.details,
            amountWei: tx.details.amountWei ? BigInt(tx.details.amountWei) : undefined,
            requestId: tx.details.requestId ? BigInt(tx.details.requestId) : undefined,
            offerId: tx.details.offerId ? BigInt(tx.details.offerId) : undefined,
          },
        }));
        setTransactions(converted);
      }
    } catch (error) {
      console.error('Error loading transaction history:', error);
    }
  }, [address]);

  // Save transactions to localStorage
  const saveTransactions = useCallback((newTransactions: Transaction[]) => {
    if (!address) return;

    try {
      const key = `${STORAGE_KEY_PREFIX}${address.toLowerCase()}`;
      // Convert bigint to string for JSON storage
      const serializable = newTransactions.map(tx => ({
        ...tx,
        details: {
          ...tx.details,
          amountWei: tx.details.amountWei?.toString(),
          requestId: tx.details.requestId?.toString(),
          offerId: tx.details.offerId?.toString(),
        },
      }));
      localStorage.setItem(key, JSON.stringify(serializable));
      setTransactions(newTransactions);
    } catch (error) {
      console.error('Error saving transaction history:', error);
    }
  }, [address]);

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'timestamp'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    const updated = [newTransaction, ...transactions].slice(0, 100); // Keep last 100 transactions
    saveTransactions(updated);
    return newTransaction.id;
  }, [transactions, saveTransactions]);

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    const updated = transactions.map(tx => 
      tx.id === id ? { ...tx, ...updates } : tx
    );
    saveTransactions(updated);
  }, [transactions, saveTransactions]);

  const clearHistory = useCallback(() => {
    if (!address) return;
    const key = `${STORAGE_KEY_PREFIX}${address.toLowerCase()}`;
    localStorage.removeItem(key);
    setTransactions([]);
  }, [address]);

  // Helper function to format transaction for display
  const formatTransaction = useCallback((tx: Transaction) => {
    const date = new Date(tx.timestamp);
    const formattedDate = date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let title = '';
    let description = '';
    let icon = '';

    switch (tx.type) {
      case 'borrow_request':
        title = 'Borrow Request Submitted';
        description = `Requested ${tx.details.amount || 'N/A'} for ${tx.details.term || 'N/A'} months`;
        icon = '📝';
        break;
      case 'lender_offer':
        title = 'Lending Offer Submitted';
        description = `Offered ${tx.details.amount || 'N/A'} at ${tx.details.apr || 'N/A'}% APR`;
        icon = '💰';
        break;
      case 'accept_offer':
        title = 'Loan Offer Accepted';
        description = `Accepted offer for ${tx.details.amount || 'N/A'} at ${tx.details.apr || 'N/A'}% APR`;
        icon = '✅';
        break;
      case 'loan_accepted':
        title = 'Loan Accepted';
        description = `Accepted offer for ${tx.details.amount || 'N/A'}`;
        icon = '✅';
        break;
      case 'match_search':
        title = 'Match Search';
        description = `Searched for borrowers with min score ${tx.details.minScore || 'N/A'}`;
        icon = '🔍';
        break;
    }

    return {
      ...tx,
      formattedDate,
      title,
      description,
      icon,
    };
  }, []);

  return {
    transactions,
    addTransaction,
    updateTransaction,
    clearHistory,
    formatTransaction,
  };
};


