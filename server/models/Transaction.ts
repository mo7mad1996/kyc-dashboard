import mongoose, { Document, Schema } from "mongoose";

export interface ITransaction extends Document {
  _id: any;
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
  createdBy: mongoose.Types.ObjectId;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    fromCurrency: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },
    toCurrency: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    convertedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    exchangeRate: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "processing", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    kycStatus: {
      type: String,
      required: true,
      enum: ["not_started", "pending", "approved", "rejected"],
      default: "not_started",
      index: true,
    },
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    receiverId: {
      type: String,
      required: true,
      index: true,
    },
    region: {
      type: String,
      required: true,
      index: true,
    },
    partnerId: {
      type: String,
      index: true,
    },
    fees: {
      platform: { type: Number, required: true, min: 0 },
      exchange: { type: Number, required: true, min: 0 },
      total: { type: Number, required: true, min: 0 },
    },
    metadata: {
      senderName: { type: String, required: true, trim: true },
      receiverName: { type: String, required: true, trim: true },
      purpose: { type: String, required: true, trim: true },
      channel: { type: String, required: true, trim: true },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for performance
TransactionSchema.index({ status: 1, createdAt: -1 });
TransactionSchema.index({ region: 1, status: 1 });
TransactionSchema.index({ partnerId: 1, status: 1 });
TransactionSchema.index({ createdBy: 1, createdAt: -1 });

export const Transaction = mongoose.model<ITransaction>(
  "Transaction",
  TransactionSchema
);
