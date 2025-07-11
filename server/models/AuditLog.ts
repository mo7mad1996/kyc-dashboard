export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure' | 'warning';
  timestamp: Date;
  sessionId?: string;
}

// Mock audit logs for demo
export const mockAuditLogs: AuditLog[] = [
  {
    id: 'audit_001',
    userId: '1',
    userName: 'Global Administrator',
    userRole: 'global_admin',
    action: 'login',
    resource: 'authentication',
    details: { method: 'email_password' },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    status: 'success',
    timestamp: new Date(Date.now() - 3600000)
  },
  {
    id: 'audit_002',
    userId: '2',
    userName: 'Regional Admin - West Africa',
    userRole: 'regional_admin',
    action: 'view_transaction',
    resource: 'transaction',
    resourceId: 'txn_001',
    details: { transactionAmount: 1000, currency: 'USD' },
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    status: 'success',
    timestamp: new Date(Date.now() - 1800000)
  },
  {
    id: 'audit_003',
    userId: '3',
    userName: 'Sending Partner - MoneyGram',
    userRole: 'sending_partner',
    action: 'create_transaction',
    resource: 'transaction',
    resourceId: 'txn_002',
    details: { amount: 500, fromCurrency: 'USD', toCurrency: 'USDC' },
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    status: 'success',
    timestamp: new Date(Date.now() - 900000)
  }
];