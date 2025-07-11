import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { mockUsers } from "../models/User.js";
import { logAuditEvent } from "../services/auditService.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "secret-key";

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = mockUsers.find((u) => u.email === email);
    if (!user || !user.isActive) {
      logAuditEvent({
        userId: "unknown",
        userName: email,
        userRole: "unknown",
        action: "login_failed",
        resource: "authentication",
        details: { email, reason: "User not found or inactive" },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
        status: "failure",
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      logAuditEvent({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: "login_failed",
        resource: "authentication",
        details: { email, reason: "Invalid password" },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
        status: "failure",
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    logAuditEvent({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "login_success",
      resource: "authentication",
      details: { email, method: "email_password" },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || "",
      status: "success",
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        region: user.region,
        permissions: user.permissions,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get current user
router.get("/me", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = mockUsers.find((u) => u.id === decoded.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      region: user.region,
      permissions: user.permissions,
    });
  } catch (error) {
    res.status(403).json({ error: "Invalid token" });
  }
});

export { router as authRoutes };
