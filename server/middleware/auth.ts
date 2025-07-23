import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { logAuditEvent } from "../services/auditService.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id).select("-password");

    if (!user || !user.isActive) {
      await logAuditEvent({
        userId: decoded.id || "unknown",
        userName: "Unknown User",
        userRole: "unknown",
        action: "failed_authentication",
        resource: "authentication",
        details: { error: "User not found or inactive" },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "",
        status: "failure",
      });
      return res.status(403).json({ error: "User not found or inactive" });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      region: user.region,
      permissions: user.permissions,
    };

    next();
  } catch (err: any) {
    await logAuditEvent({
      userId: "unknown",
      userName: "Unknown User",
      userRole: "unknown",
      action: "failed_authentication",
      resource: "authentication",
      details: { error: "Invalid token" },
      ipAddress: req.ip || "unknown",
      userAgent: req.get("User-Agent") || "",
      status: "failure",
    });
    return res.status(403).json({ error: "Invalid token" });
  }
};

export const requireRole = (roles: string[]) => {
  return async (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      await logAuditEvent({
        userId: req.user?.id || "unknown",
        userName: req.user?.name || "Unknown User",
        userRole: req.user?.role || "unknown",
        action: "access_denied",
        resource: req.originalUrl,
        details: { requiredRoles: roles, userRole: req.user?.role },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "",
        status: "failure",
      });
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
};

export const requirePermission = (permission: string) => {
  return async (req: any, res: any, next: any) => {
    if (!req.user || !req.user.permissions.includes(permission)) {
      await logAuditEvent({
        userId: req.user?.id || "unknown",
        userName: req.user?.name || "Unknown User",
        userRole: req.user?.role || "unknown",
        action: "permission_denied",
        resource: req.originalUrl,
        details: {
          requiredPermission: permission,
          userPermissions: req.user?.permissions,
        },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "",
        status: "failure",
      });
      return res.status(403).json({ error: "Permission denied" });
    }
    next();
  };
};
