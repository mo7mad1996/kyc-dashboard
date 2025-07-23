import express from "express";
import { AuditLog } from "../models/AuditLog.js";
import { authenticateToken, requirePermission } from "../middleware/auth.js";
import { logAuditEvent } from "../services/auditService.js";

const router = express.Router();
/**
 * @swagger
 * /api/audit:
 *   get:
 *     summary: Retrieve filtered audit logs
 *     tags: [Audit]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: resource
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
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
 *         description: List of audit logs
 */
router.get(
  "/",
  authenticateToken,
  requirePermission("read"),
  async (req: any, res) => {
    try {
      const {
        userId,
        action,
        resource,
        status,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
        search,
      } = req.query;
      let query: any = {};

      if (req.user.role !== "global_admin") {
        query.userId = req.user.id;
      }

      if (userId) query.userId = userId;
      if (action) query.action = { $regex: action, $options: "i" };
      if (resource) query.resource = { $regex: resource, $options: "i" };
      if (status) query.status = status;
      if (startDate)
        query.createdAt = { ...query.createdAt, $gte: new Date(startDate) };
      if (endDate)
        query.createdAt = { ...query.createdAt, $lte: new Date(endDate) };

      if (search) {
        query.$or = [
          { userName: { $regex: search, $options: "i" } },
          { action: { $regex: search, $options: "i" } },
          { resource: { $regex: search, $options: "i" } },
          { ipAddress: { $regex: search, $options: "i" } },
        ];
      }

      const total = await AuditLog.countDocuments(query);
      const logs = await AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(Number(offset))
        .limit(Number(limit));

      await logAuditEvent({
        userId: req.user.id,
        userName: req.user.name || "Unknown",
        userRole: req.user.role,
        action: "view_audit_logs",
        resource: "audit_log",
        details: { filters: req.query, resultCount: logs.length },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "",
        status: "success",
      });

      res.json({ logs, total, offset: Number(offset), limit: Number(limit) });
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /api/audit/stats:
 *   get:
 *     summary: Get audit statistics
 *     tags: [Audit]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Audit statistics
 */
router.get(
  "/stats",
  authenticateToken,
  requirePermission("read"),
  async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);

      const query: any = Object.keys(dateFilter).length
        ? { createdAt: dateFilter }
        : {};
      if (req.user.role !== "global_admin") query.userId = req.user.id;

      const [
        totalEvents,
        successEvents,
        failureEvents,
        warningEvents,
        actionBreakdown,
        resourceBreakdown,
        userBreakdown,
      ] = await Promise.all([
        AuditLog.countDocuments(query),
        AuditLog.countDocuments({ ...query, status: "success" }),
        AuditLog.countDocuments({ ...query, status: "failure" }),
        AuditLog.countDocuments({ ...query, status: "warning" }),
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: "$action", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: "$resource", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: "$userRole", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
      ]);

      const stats = {
        totalEvents,
        successEvents,
        failureEvents,
        warningEvents,
        actionBreakdown: Object.fromEntries(
          actionBreakdown.map((i) => [i._id, i.count])
        ),
        resourceBreakdown: Object.fromEntries(
          resourceBreakdown.map((i) => [i._id, i.count])
        ),
        userBreakdown: Object.fromEntries(
          userBreakdown.map((i) => [i._id, i.count])
        ),
      };

      await logAuditEvent({
        userId: req.user.id,
        userName: req.user.name || "Unknown",
        userRole: req.user.role,
        action: "view_audit_stats",
        resource: "audit_log",
        details: { dateRange: { startDate, endDate } },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "",
        status: "success",
      });

      res.json(stats);
    } catch (error) {
      console.error("Get audit stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /api/audit/export/{format}:
 *   get:
 *     summary: Export audit logs
 *     tags: [Audit]
 *     parameters:
 *       - in: path
 *         name: format
 *         required: true
 *         schema: { type: string, enum: [csv, json] }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: resource
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Exported audit logs
 */
router.get(
  "/export/:format",
  authenticateToken,
  requirePermission("read"),
  async (req: any, res) => {
    try {
      const { format } = req.params;
      const { userId, action, resource, status, startDate, endDate } =
        req.query;

      if (!["csv", "json"].includes(format)) {
        return res
          .status(400)
          .json({ error: "Invalid export format. Use csv or json." });
      }

      let query: any = {};
      if (req.user.role !== "global_admin") query.userId = req.user.id;

      if (userId) query.userId = userId;
      if (action) query.action = { $regex: action, $options: "i" };
      if (resource) query.resource = { $regex: resource, $options: "i" };
      if (status) query.status = status;
      if (startDate)
        query.createdAt = { ...query.createdAt, $gte: new Date(startDate) };
      if (endDate)
        query.createdAt = { ...query.createdAt, $lte: new Date(endDate) };

      const logs = await AuditLog.find(query).sort({ createdAt: -1 }).lean();

      await logAuditEvent({
        userId: req.user.id,
        userName: req.user.name || "Unknown",
        userRole: req.user.role,
        action: "export_audit_logs",
        resource: "audit_log",
        details: { format, filters: req.query, count: logs.length },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "",
        status: "success",
      });

      if (format === "csv") {
        const csvData: any[] = logs.map((log) => ({
          ID: log._id,
          Timestamp: log.createdAt,
          "User Name": log.userName,
          "User Role": log.userRole,
          Action: log.action,
          Resource: log.resource,
          "Resource ID": log.resourceId || "N/A",
          Status: log.status,
          "IP Address": log.ipAddress,
          "User Agent": log.userAgent,
          Details: JSON.stringify(log.details),
        }));

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=audit-logs-${
            new Date().toISOString().split("T")[0]
          }.csv`
        );

        const headers: string[] = Object.keys(csvData[0] || {});
        const csvContent = [
          headers.join(","),
          ...csvData.map((row) => headers.map((h) => `"${row[h]}"`).join(",")),
        ].join("\n");

        res.send(csvContent);
      } else {
        res.setHeader("Content-Type", "application/json");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=audit-logs-${
            new Date().toISOString().split("T")[0]
          }.json`
        );
        res.json(logs);
      }
    } catch (error) {
      console.error("Export audit logs error:", error);
      res.status(500).json({ error: "Export failed" });
    }
  }
);

export { router as auditRoutes };
