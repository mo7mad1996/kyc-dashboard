import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { logAuditEvent } from "../services/auditService";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: myPassword123
 *     responses:
 *       200:
 *         description: Successful login
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      isActive: true,
    });

    if (!user) {
      await logAuditEvent({
        userId: "unknown",
        userName: email,
        userRole: "unknown",
        action: "login_failed",
        resource: "authentication",
        details: { email, reason: "User not found or inactive" },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "",
        status: "failure",
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await logAuditEvent({
        userId: user._id.toString(),
        userName: user.name,
        userRole: user.role,
        action: "login_failed",
        resource: "authentication",
        details: { email, reason: "Invalid password" },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "",
        status: "failure",
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    await logAuditEvent({
      userId: user._id.toString(),
      userName: user.name,
      userRole: user.role,
      action: "login_success",
      resource: "authentication",
      details: { email, method: "email_password" },
      ipAddress: req.ip || "unknown",
      userAgent: req.get("User-Agent") || "",
      status: "success",
    });

    res.json({
      token,
      user: {
        id: user._id,
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

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User info
 *       401:
 *         description: Access token required
 *       403:
 *         description: Invalid token
 *       404:
 *         description: User not found
 */
router.get("/me", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id).select("-password");

    if (!user || !user.isActive) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user._id,
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

/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     summary: Get all users (name and ID)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Access token required
 *       403:
 *         description: Invalid token
 *       404:
 *         description: User not found
 */
router.get("/users", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id).select("-password");

    if (!user || !user.isActive) {
      return res.status(404).json({ error: "User not found" });
    }

    const users = await User.find().select("name _id");

    res.json(users);
  } catch (error) {
    res.status(403).json({ error: "Invalid token" });
  }
});

export { router as authRoutes };
