import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  RefreshCw,
  XCircle,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { transactionAPI } from "../services/api";
import { clsx } from "clsx";
import { format } from "date-fns";

interface Transaction {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  convertedAmount: number;
  exchangeRate: number;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  kycStatus: "not_started" | "pending" | "approved" | "rejected";
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
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export const TransactionsPage: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [kycFilter, setKycFilter] = useState("");
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (kycFilter) params.kycStatus = kycFilter;

      const response = await transactionAPI.getTransactions(params);
      setTransactions(response.transactions);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [statusFilter, kycFilter]);

  const filteredTransactions = transactions.filter(
    (transaction) =>
      transaction.metadata.senderName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transaction.metadata.receiverName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "processing":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case "failed":
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "failed":
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "not_started":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const updateTransactionStatus = async (
    transactionId: string,
    status: string,
    kycStatus?: string
  ) => {
    try {
      const updates: any = { status };
      if (kycStatus) updates.kycStatus = kycStatus;

      await transactionAPI.updateTransactionStatus(transactionId, updates);
      await loadTransactions();
      setSelectedTransaction(null);
    } catch (error) {
      console.error("Error updating transaction:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-200 rounded animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600">
            Manage and monitor all transaction activities
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          {user?.permissions.includes("write") && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Transaction</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All KYC Status</option>
            <option value="not_started">Not Started</option>
            <option value="pending">KYC Pending</option>
            <option value="approved">KYC Approved</option>
            <option value="rejected">KYC Rejected</option>
          </select>

          <button
            onClick={loadTransactions}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  KYC Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          {transaction.fromCurrency === "USD" ? (
                            <ArrowUpRight className="h-5 w-5 text-blue-600" />
                          ) : (
                            <ArrowDownRight className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.metadata.senderName} →{" "}
                          {transaction.metadata.receiverName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {transaction.id} • {transaction.metadata.purpose}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="font-medium">
                        ${transaction.amount.toLocaleString()}{" "}
                        {transaction.fromCurrency}
                      </div>
                      <div className="text-gray-500">
                        Rate: {transaction.exchangeRate.toFixed(4)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(transaction.status)}
                      <span
                        className={clsx(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          getStatusColor(transaction.status)
                        )}
                      >
                        {transaction.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={clsx(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        getKycStatusColor(transaction.kycStatus)
                      )}
                    >
                      {transaction.kycStatus.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      {format(new Date(transaction.createdAt), "MMM d, yyyy")}
                    </div>
                    <div className="text-xs">
                      {format(new Date(transaction.createdAt), "HH:mm")}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedTransaction(transaction)}
                      className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <ArrowRightLeft className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No transactions
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter || kycFilter
                ? "No transactions match your current filters."
                : "Get started by creating a new transaction."}
            </p>
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Transaction Details
              </h3>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Transaction ID
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedTransaction.id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Region
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedTransaction.region}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    From
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedTransaction.metadata.senderName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    To
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedTransaction.metadata.receiverName}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Amount
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    ${selectedTransaction.amount.toLocaleString()}{" "}
                    {selectedTransaction.fromCurrency}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Exchange Rate
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedTransaction.exchangeRate.toFixed(4)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Fees
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    ${selectedTransaction.fees.total.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Status
                  </label>
                  <div className="mt-1 flex items-center space-x-2">
                    {getStatusIcon(selectedTransaction.status)}
                    <span
                      className={clsx(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        getStatusColor(selectedTransaction.status)
                      )}
                    >
                      {selectedTransaction.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    KYC Status
                  </label>
                  <span
                    className={clsx(
                      "mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      getKycStatusColor(selectedTransaction.kycStatus)
                    )}
                  >
                    {selectedTransaction.kycStatus.replace("_", " ")}
                  </span>
                </div>
              </div>

              {user?.permissions.includes("write") && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Actions
                  </h4>
                  <div className="flex space-x-2">
                    {selectedTransaction.status === "pending" && (
                      <>
                        <button
                          onClick={() =>
                            updateTransactionStatus(
                              selectedTransaction.id,
                              "processing"
                            )
                          }
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Start Processing
                        </button>
                        <button
                          onClick={() =>
                            updateTransactionStatus(
                              selectedTransaction.id,
                              "cancelled"
                            )
                          }
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {selectedTransaction.status === "processing" && (
                      <button
                        onClick={() =>
                          updateTransactionStatus(
                            selectedTransaction.id,
                            "completed"
                          )
                        }
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Mark Complete
                      </button>
                    )}
                    {selectedTransaction.kycStatus === "pending" && (
                      <>
                        <button
                          onClick={() =>
                            updateTransactionStatus(
                              selectedTransaction.id,
                              selectedTransaction.status,
                              "approved"
                            )
                          }
                          className="px-3 py-1 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700"
                        >
                          Approve KYC
                        </button>
                        <button
                          onClick={() =>
                            updateTransactionStatus(
                              selectedTransaction.id,
                              selectedTransaction.status,
                              "rejected"
                            )
                          }
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Reject KYC
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
