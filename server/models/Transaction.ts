export interface Transaction {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  convertedAmount: number;
  exchangeRate: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  kycStatus: 'not_started' | 'pending' | 'approved' | 'rejected';
  senderId: string;
  receiverId: string;
  region: string;
  partnerId?: string;
  fees: {
    platform: number;
    exchange: number;
    total: number;
  };
  metadata: {
    senderName: string;
    receiverName: string;
    purpose: string;
    channel: string;
  };
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// Mock transactions for demo
export const mockTransactions: Transaction[] = [
  {
    id: 'txn_001',
    fromCurrency: 'USD',
    toCurrency: 'USDC',
    amount: 1000,
    convertedAmount: 1000,
    exchangeRate: 1.0,
    status: 'completed',
    kycStatus: 'approved',
    senderId: 'sender_001',
    receiverId: 'receiver_001',
    region: 'west_africa',
    partnerId: '3',
    fees: {
      platform: 10,
      exchange: 5,
      total: 15
    },
    metadata: {
      senderName: 'John Smith',
      receiverName: 'Amara Kone',
      purpose: 'Family Support',
      channel: 'mobile'
    },
    createdAt: new Date(Date.now() - 3600000),
    updatedAt: new Date(Date.now() - 1800000),
    completedAt: new Date(Date.now() - 1800000)
  },
  {
    id: 'txn_002',
    fromCurrency: 'USD',
    toCurrency: 'USDC',
    amount: 500,
    convertedAmount: 500,
    exchangeRate: 1.0,
    status: 'processing',
    kycStatus: 'pending',
    senderId: 'sender_002',
    receiverId: 'receiver_002',
    region: 'west_africa',
    partnerId: '3',
    fees: {
      platform: 5,
      exchange: 2.5,
      total: 7.5
    },
    metadata: {
      senderName: 'Sarah Johnson',
      receiverName: 'Ibrahim Diallo',
      purpose: 'Education',
      channel: 'web'
    },
    createdAt: new Date(Date.now() - 1800000),
    updatedAt: new Date(Date.now() - 900000)
  }
];