import express from "express";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { authenticateToken, requirePermission } from "../middleware/auth.js";
import { logAuditEvent } from "../services/auditService.js";
import { calculateConversion } from "../services/cybridService.js";

const router = express.Router();

// Get transactions (with role-based filtering)
/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Retrieve list of transactions with optional filters, pagination, and role-based access
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: kycStatus
 *         schema: { type: string }
 *       - in: query
 *         name: region
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of transactions and pagination metadata
 */
router.get(
  "/",
  authenticateToken,
  requirePermission("read"),
  async (req: any, res) => {
    try {
      const {
        status,
        kycStatus,
        region,
        limit = 50,
        offset = 0,
        search,
      } = req.query;

      // Build query based on user role
      let query: any = {};

      if (req.user.role === "regional_admin") {
        const user = await User.findById(req.user.id);
        if (user?.region) {
          query.region = user.region;
        }
      } else if (
        req.user.role === "sending_partner" ||
        req.user.role === "receiving_partner"
      ) {
        query.partnerId = req.user.id;
      }

      // Apply filters
      if (status) query.status = status;
      if (kycStatus) query.kycStatus = kycStatus;
      if (region && req.user.role === "global_admin") query.region = region;

      // Search functionality
      if (search) {
        query.$or = [
          { "metadata.senderName": { $regex: search, $options: "i" } },
          { "metadata.receiverName": { $regex: search, $options: "i" } },
          { senderId: { $regex: search, $options: "i" } },
          { receiverId: { $regex: search, $options: "i" } },
        ];
      }

      const total = await Transaction.countDocuments(query);
      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(Number(offset))
        .limit(Number(limit))
        .populate("createdBy", "name email role");

      await logAuditEvent({
        userId: req.user.id,
        userName: req.user.name || "Unknown",
        userRole: req.user.role,
        action: "view_transactions",
        resource: "transaction",
        details: { filters: req.query, count: transactions.length },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "",
        status: "success",
      });

      res.json({
        transactions,
        total,
        offset: Number(offset),
        limit: Number(limit),
      });
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get transaction by ID
/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: Retrieve a single transaction by ID with role-based access control
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Transaction details
 *       403:
 *         description: Access denied
 *       404:
 *         description: Transaction not found
 */

router.get(
  "/:id",
  authenticateToken,
  requirePermission("read"),
  async (req: any, res) => {
    try {
      const transaction: any = await Transaction.findById(
        req.params.id
      ).populate("createdBy", "name email role");

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      // Role-based access control
      const user = await User.findById(req.user.id);
      if (
        req.user.role === "regional_admin" &&
        user?.region &&
        transaction.region !== user.region
      ) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (
        (req.user.role === "sending_partner" ||
          req.user.role === "receiving_partner") &&
        transaction.partnerId !== req.user.id
      ) {
        return res.status(403).json({ error: "Access denied" });
      }

      await logAuditEvent({
        userId: req.user.id,
        userName: req.user.name || "Unknown",
        userRole: req.user.role,
        action: "view_transaction",
        resource: "transaction",
        resourceId: transaction._id.toString(),
        details: {
          transactionAmount: transaction.amount,
          status: transaction.status,
        },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "",
        status: "success",
      });

      res.json(transaction);
    } catch (error) {
      console.error("Get transaction error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Create new transaction
/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Create a new transaction with currency conversion
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromCurrency, toCurrency, amount, senderId, receiverId, region, metadata]
 *             properties:
 *               fromCurrency: { type: string }
 *               toCurrency: { type: string }
 *               amount: { type: number }
 *               senderId: { type: string }
 *               receiverId: { type: string }
 *               region: { type: string }
 *               metadata: { type: object }
 *     responses:
 *       201:
 *         description: Created transaction
 *       400:
 *         description: Missing required fields
 */
router.post(
  "/",
  authenticateToken,
  requirePermission("write"),
  async (req: any, res) => {
    try {
      const {
        fromCurrency,
        toCurrency,
        amount,
        senderId,
        receiverId,
        region,
        metadata,
      } = req.body;

      // Validate required fields
      if (
        !fromCurrency ||
        !toCurrency ||
        !amount ||
        !senderId ||
        !receiverId ||
        !region ||
        !metadata
      ) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Calculate conversion using Cybrid service
      const conversion = await calculateConversion(
        amount,
        fromCurrency,
        toCurrency
      );

      const transaction: any = new Transaction({
        fromCurrency,
        toCurrency,
        amount,
        convertedAmount: conversion.convertedAmount,
        exchangeRate: conversion.exchangeRate,
        status: "pending",
        kycStatus: "not_started",
        senderId,
        receiverId,
        region,
        partnerId: req.user.role.includes("partner") ? req.user.id : undefined,
        fees: {
          platform: conversion.fee * 0.7,
          exchange: conversion.fee * 0.3,
          total: conversion.fee,
        },
        metadata,
        createdBy: req.user.id,
      });

      await transaction.save();

      const auditLog = await logAuditEvent({
        userId: req.user.id,
        userName: req.user.name || "Unknown",
        userRole: req.user.role,
        action: "create_transaction",
        resource: "transaction",
        resourceId: transaction._id.toString(),
        details: { amount, fromCurrency, toCurrency, region },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "",
        status: "success",
      });

      res.status(201).json(transaction);
    } catch (error: any) {
      console.error("Create transaction error:", error);

      const auditLog = await logAuditEvent({
        userId: req.user.id,
        userName: req.user.name || "Unknown",
        userRole: req.user.role,
        action: "create_transaction_failed",
        resource: "transaction",
        details: { error: error.message, requestBody: req.body },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "",
        status: "failure",
      });

      res.status(500).json({ error: "Failed to create transaction", auditLog });
    }
  }
);

// Update transaction status
/**
 * @swagger
 * /api/transactions/{id}/status:
 *   patch:
 *     summary: Update status and/or KYC status of a transaction
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string }
 *               kycStatus: { type: string }
 *     responses:
 *       200:
 *         description: Updated transaction
 *       404:
 *         description: Transaction not found
 */
router.patch(
  "/:id/status",
  authenticateToken,
  requirePermission("write"),
  async (req: any, res) => {
    try {
      const { status, kycStatus } = req.body;
      const transaction: any = await Transaction.findById(req.params.id);

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      // Role-based access control
      const user = await User.findById(req.user.id);
      if (
        req.user.role === "regional_admin" &&
        user?.region &&
        transaction.region !== user.region
      ) {
        return res.status(403).json({ error: "Access denied" });
      }

      const oldStatus = {
        status: transaction.status,
        kycStatus: transaction.kycStatus,
      };

      if (status) transaction.status = status;
      if (kycStatus) transaction.kycStatus = kycStatus;

      if (status === "completed") {
        transaction.completedAt = new Date();
      }

      await transaction.save();

      await logAuditEvent({
        userId: req.user.id,
        userName: req.user.name || "Unknown",
        userRole: req.user.role,
        action: "update_transaction_status",
        resource: "transaction",
        resourceId: transaction._id.toString(),
        details: { oldStatus, newStatus: { status, kycStatus } },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "",
        status: "success",
      });

      res.json(transaction);
    } catch (error) {
      console.error("Update transaction error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Delete transaction
/**
 * @swagger
 * /api/transactions/{id}:
 *   delete:
 *     summary: Delete a transaction (global admin only)
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Transaction deleted successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Transaction not found
 */
router.delete(
  "/:id",
  authenticateToken,
  requirePermission("delete"),
  async (req: any, res) => {
    try {
      const transaction: any = await Transaction.findById(req.params.id);

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      // Only global admins can delete transactions
      if (req.user.role !== "global_admin") {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      await Transaction.findByIdAndDelete(req.params.id);

      await logAuditEvent({
        userId: req.user.id,
        userName: req.user.name || "Unknown",
        userRole: req.user.role,
        action: "delete_transaction",
        resource: "transaction",
        resourceId: transaction._id.toString(),
        details: {
          deletedTransaction: {
            id: transaction._id,
            amount: transaction.amount,
          },
        },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "",
        status: "success",
      });

      res.json({ message: "Transaction deleted successfully" });
    } catch (error) {
      console.error("Delete transaction error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Export transactions
/**
 * @swagger
 * /api/transactions/export/{format}:
 *   get:
 *     summary: Export transactions to CSV or JSON with filters
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: format
 *         required: true
 *         schema: { type: string, enum: [csv, json] }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: kycStatus
 *         schema: { type: string }
 *       - in: query
 *         name: region
 *         schema: { type: string }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Exported file attachment
 *       400:
 *         description: Invalid export format
 */
router.get(
  "/export/:format",
  authenticateToken,
  requirePermission("read"),
  async (req: any, res) => {
    try {
      const { format } = req.params;
      const { status, kycStatus, region, startDate, endDate } = req.query;

      if (!["csv", "json"].includes(format)) {
        return res
          .status(400)
          .json({ error: "Invalid export format. Use csv or json." });
      }

      // Build query based on user role
      let query: any = {};

      if (req.user.role === "regional_admin") {
        const user = await User.findById(req.user.id);
        if (user?.region) {
          query.region = user.region;
        }
      } else if (
        req.user.role === "sending_partner" ||
        req.user.role === "receiving_partner"
      ) {
        query.partnerId = req.user.id;
      }

      // Apply filters
      if (status) query.status = status;
      if (kycStatus) query.kycStatus = kycStatus;
      if (region && req.user.role === "global_admin") query.region = region;
      if (startDate)
        query.createdAt = { ...query.createdAt, $gte: new Date(startDate) };
      if (endDate)
        query.createdAt = { ...query.createdAt, $lte: new Date(endDate) };

      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .populate("createdBy", "name email role")
        .lean();

      await logAuditEvent({
        userId: req.user.id,
        userName: req.user.name || "Unknown",
        userRole: req.user.role,
        action: "export_transactions",
        resource: "transaction",
        details: { format, filters: req.query, count: transactions.length },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "",
        status: "success",
      });

      if (format === "csv") {
        const csvData: any[] = transactions.map((t) => ({
          ID: t._id,
          "Sender Name": t.metadata.senderName,
          "Receiver Name": t.metadata.receiverName,
          "From Currency": t.fromCurrency,
          "To Currency": t.toCurrency,
          Amount: t.amount,
          "Converted Amount": t.convertedAmount,
          "Exchange Rate": t.exchangeRate,
          Status: t.status,
          "KYC Status": t.kycStatus,
          Region: t.region,
          Purpose: t.metadata.purpose,
          "Created At": t.createdAt,
          "Completed At": t.completedAt || "N/A",
        }));

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=transactions-${
            new Date().toISOString().split("T")[0]
          }.csv`
        );

        // Simple CSV conversion
        const headers: string[] = Object.keys(csvData[0] || {});
        const csvContent = [
          headers.join(","),
          ...csvData.map((row) =>
            headers.map((header) => `"${row[header]}"`).join(",")
          ),
        ].join("\n");

        res.send(csvContent);
      } else {
        res.setHeader("Content-Type", "application/json");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=transactions-${
            new Date().toISOString().split("T")[0]
          }.json`
        );
        res.json(transactions);
      }
    } catch (error) {
      console.error("Export transactions error:", error);
      res.status(500).json({ error: "Export failed" });
    }
  }
);

export { router as transactionRoutes };
