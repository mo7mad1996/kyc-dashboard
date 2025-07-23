import { AuditLog } from "../models/AuditLog.js";

export const logAuditEvent = async (eventData: {
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  status: "success" | "failure" | "warning";
  sessionId?: string;
}) => {
  try {
    const auditLog = new AuditLog(eventData);
    await auditLog.save();

    return auditLog;
  } catch (error) {
    console.error("❌ Failed to log audit event:", error);
    // Don't throw error to avoid breaking the main operation
  }
};
