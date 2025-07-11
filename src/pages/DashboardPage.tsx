import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  ArrowRightLeft, 
  AlertTriangle,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { transactionAPI, auditAPI, cybridAPI } from '../services/api';
import { clsx } from 'clsx';
import { format } from 'date-fns';

interface DashboardStats {
  totalTransactions: number;
  pendingTransactions: number;
  completedTransactions: number;
  totalVolume: number;
  averageAmount: number;
  successRate: number;
}

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: string;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [auditStats, setAuditStats] = useState<any>(null);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      
      // Load transactions
      const transactionsResponse = await transactionAPI.getTransactions({ limit: 10 });
      const transactions = transactionsResponse.transactions;
      setRecentTransactions(transactions);

      // Calculate stats
      const dashboardStats: DashboardStats = {
        totalTransactions: transactionsResponse.total,
        pendingTransactions: transactions.filter((t: any) => t.status === 'pending' || t.status === 'processing').length,
        completedTransactions: transactions.filter((t: any) => t.status === 'completed').length,
        totalVolume: transactions.reduce((sum: number, t: any) => sum + t.amount, 0),
        averageAmount: transactions.length > 0 ? transactions.reduce((sum: number, t: any) => sum + t.amount, 0) / transactions.length : 0,
        successRate: transactions.length > 0 ? (transactions.filter((t: any) => t.status === 'completed').length / transactions.length) * 100 : 0
      };
      setStats(dashboardStats);

      // Load audit stats (only for admins)
      if (user?.role === 'global_admin' || user?.role === 'regional_admin') {
        const auditResponse = await auditAPI.getAuditStats();
        setAuditStats(auditResponse);
      }

      // Load exchange rate
      const rateResponse = await cybridAPI.getExchangeRates('USD', 'USDC');
      setExchangeRate(rateResponse);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name}
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your KYC operations today.
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={refreshing}
          className={clsx(
            'flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors',
            refreshing
              ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'
              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
          )}
        >
          <RefreshCw className={clsx('h-4 w-4', refreshing && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalTransactions || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <ArrowRightLeft className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+12% from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.pendingTransactions || 0}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
            <span className="text-yellow-600">Requires attention</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Volume</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats?.totalVolume?.toLocaleString() || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-600">
              Avg: ${stats?.averageAmount?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || 0}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.successRate?.toFixed(1) || 0}%
              </p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <CheckCircle className="h-4 w-4 text-emerald-500 mr-1" />
            <span className="text-emerald-600">Above target</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            </div>
            <div className="p-6">
              {recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(transaction.status)}
                        <div>
                          <p className="font-medium text-gray-900">
                            {transaction.metadata.senderName} → {transaction.metadata.receiverName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {transaction.fromCurrency} to {transaction.toCurrency} • {transaction.metadata.purpose}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          ${transaction.amount.toLocaleString()}
                        </p>
                        <span className={clsx(
                          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                          getStatusColor(transaction.status)
                        )}>
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No recent transactions</p>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Exchange Rate */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Exchange Rate</h2>
            </div>
            <div className="p-6">
              {exchangeRate ? (
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {exchangeRate.rate.toFixed(4)}
                  </div>
                  <p className="text-gray-600 mb-1">
                    {exchangeRate.from} to {exchangeRate.to}
                  </p>
                  <p className="text-xs text-gray-500">
                    Updated {format(new Date(exchangeRate.timestamp), 'MMM d, HH:mm')}
                  </p>
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      ↗ Stable rate maintained
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center">Rate unavailable</p>
              )}
            </div>
          </div>

          {/* Audit Summary - Only for admins */}
          {(user?.role === 'global_admin' || user?.role === 'regional_admin') && auditStats && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Security Overview</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Events (24h)</span>
                    <span className="font-semibold">{auditStats.totalEvents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Success Rate</span>
                    <span className="font-semibold text-green-600">
                      {((auditStats.successEvents / auditStats.totalEvents) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Failed Attempts</span>
                    <span className="font-semibold text-red-600">{auditStats.failureEvents}</span>
                  </div>
                </div>
                
                {auditStats.failureEvents > 0 && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-800">
                      ⚠ {auditStats.failureEvents} security events require review
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Role-specific info */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3">Your Access Level</h3>
            <div className="space-y-2">
              <p className="text-sm text-blue-800">
                <strong>Role:</strong> {user?.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
              {user?.region && (
                <p className="text-sm text-blue-800">
                  <strong>Region:</strong> {user.region.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              )}
              <div className="mt-3">
                <p className="text-xs text-blue-700 font-medium mb-1">Permissions:</p>
                <div className="flex flex-wrap gap-1">
                  {user?.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};