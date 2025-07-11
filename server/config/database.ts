import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    // In production, you would use a real MongoDB connection string
    // For demo purposes, we'll simulate the connection

    // Mock connection for demo - in production, use:
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("📊 Connected to MongoDB (Mock)");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
};
