import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  _id: any;
  email: string;
  password: string;
  name: string;
  role:
    | "global_admin"
    | "regional_admin"
    | "sending_partner"
    | "receiving_partner";
  region?: string;
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: [
        "global_admin",
        "regional_admin",
        "sending_partner",
        "receiving_partner",
      ],
      index: true,
    },
    region: {
      type: String,
      trim: true,
      index: true,
    },
    permissions: [
      {
        type: String,
        required: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
UserSchema.index({ email: 1, isActive: 1 });
UserSchema.index({ role: 1, region: 1 });

export const User = mongoose.model<IUser>("User", UserSchema);
