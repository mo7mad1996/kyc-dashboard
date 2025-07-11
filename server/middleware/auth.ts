import jwt from "jsonwebtoken";
import { mockUsers } from "../models/User.js";
import { logAuditEvent } from "../services/auditService.js";

const JWT_SECRET = process.env.JWT_SECRET || "secret-key";

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      logAuditEvent({
        userId: "unknown",
        userName: "Unknown User",
        userRole: "unknown",
        action: "failed_authentication",
        resource: "authentication",
        details: { error: "Invalid token" },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
        status: "failure",
      });
      return res.status(403).json({ error: "Invalid token" });
    }
    req.user = user;
    next();
  });
};

export const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logAuditEvent({
        userId: req.user?.id || "unknown",
        userName: req.user?.name || "Unknown User",
        userRole: req.user?.role || "unknown",
        action: "access_denied",
        resource: req.originalUrl,
        details: { requiredRoles: roles, userRole: req.user?.role },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
        status: "failure",
      });
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
};

export const requirePermission = (permission: string) => {
  return (req: any, res: any, next: any) => {
    const user = mockUsers.find((u) => u.id === req.user.id);
    if (!user || !user.permissions.includes(permission)) {
      logAuditEvent({
        userId: req.user?.id || "unknown",
        userName: req.user?.name || "Unknown User",
        userRole: req.user?.role || "unknown",
        action: "permission_denied",
        resource: req.originalUrl,
        details: {
          requiredPermission: permission,
          userPermissions: user?.permissions,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
        status: "failure",
      });
      return res.status(403).json({ error: "Permission denied" });
    }
    next();
  };
};
