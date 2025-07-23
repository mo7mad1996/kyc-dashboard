import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  getExchangeRate,
  getSupportedCurrencies,
  calculateConversion,
} from "../services/cybridService.js";
import { logAuditEvent } from "../services/auditService.js";

const router = express.Router();
/**
 * @swagger
 * /api/cybrid/rates:
 *   get:
 *     summary: Get exchange rate between two currencies
 *     tags: [Cybrid]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           example: USD
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           example: USDC
 *     responses:
 *       200:
 *         description: Exchange rate data
 *       404:
 *         description: Rate not found
 *       500:
 *         description: Server error
 */
router.get("/rates", authenticateToken, async (req: any, res) => {
  try {
    const { from = "USD", to = "USDC" } = req.query;
    const rate = await getExchangeRate(from, to);

    if (!rate)
      return res.status(404).json({ error: "Exchange rate not available" });

    logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: "get_exchange_rate",
      resource: "cybrid_api",
      details: { from, to, rate: rate.rate },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || "",
      status: "success",
    });

    res.json(rate);
  } catch (error) {
    console.error("Get exchange rate error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/cybrid/currencies:
 *   get:
 *     summary: Get list of supported currencies
 *     tags: [Cybrid]
 *     responses:
 *       200:
 *         description: Supported currencies list
 *       500:
 *         description: Server error
 */
router.get("/currencies", authenticateToken, (req: any, res) => {
  try {
    const currencies = getSupportedCurrencies();

    logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: "get_supported_currencies",
      resource: "cybrid_api",
      details: { currencies },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || "",
      status: "success",
    });

    res.json({ currencies });
  } catch (error) {
    console.error("Get currencies error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/cybrid/convert:
 *   post:
 *     summary: Convert an amount from one currency to another
 *     tags: [Cybrid]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, from, to]
 *             properties:
 *               amount:
 *                 type: number
 *               from:
 *                 type: string
 *               to:
 *                 type: string
 *     responses:
 *       200:
 *         description: Conversion result
 *       400:
 *         description: Missing or invalid input
 *       500:
 *         description: Conversion calculation failed
 */

router.post("/convert", authenticateToken, async (req: any, res) => {
  try {
    const { amount, from, to } = req.body;

    if (!amount || !from || !to) {
      return res
        .status(400)
        .json({ error: "Amount, from, and to currencies are required" });
    }

    const conversion = await calculateConversion(Number(amount), from, to);

    logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: "calculate_conversion",
      resource: "cybrid_api",
      details: {
        amount,
        from,
        to,
        convertedAmount: conversion.convertedAmount,
      },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || "",
      status: "success",
    });

    res.json(conversion);
  } catch (error: any) {
    console.error("Calculate conversion error:", error);

    logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: "calculate_conversion_failed",
      resource: "cybrid_api",
      details: { error: error.message, requestBody: req.body },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || "",
      status: "failure",
    });

    res.status(500).json({ error: "Conversion calculation failed" });
  }
});

export { router as cybridRoutes };
