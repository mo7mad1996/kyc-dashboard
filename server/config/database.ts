import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/kyc-dashboard"
    );
    console.log(`📊 MongoDB Connected: ${conn.connection.host}`);

    // Create default users if they don't exist
    await createDefaultUsers();
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
};

const createDefaultUsers = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log("🔧 Creating default users...");

      const defaultUsers = [
        {
          email: "admin@jaudi.com",
          password: await bcrypt.hash("password", 12),
          name: "Global Administrator",
          role: "global_admin",
          permissions: ["read", "write", "delete", "admin"],
          isActive: true,
        },
        {
          email: "regional@jaudi.com",
          password: await bcrypt.hash("password", 12),
          name: "Regional Admin - West Africa",
          role: "regional_admin",
          region: "west_africa",
          permissions: ["read", "write"],
          isActive: true,
        },
        {
          email: "sender@jaudi.com",
          password: await bcrypt.hash("password", 12),
          name: "Sending Partner - MoneyGram",
          role: "sending_partner",
          permissions: ["read", "write"],
          isActive: true,
        },
        {
          email: "receiver@jaudi.com",
          password: await bcrypt.hash("password", 12),
          name: "Receiving Partner - Local Bank",
          role: "receiving_partner",
          region: "west_africa",
          permissions: ["read"],
          isActive: true,
        },
      ];

      await User.insertMany(defaultUsers);
      console.log("✅ Default users created successfully");
    }
  } catch (error) {
    console.error("❌ Error creating default users:", error);
  }
};
