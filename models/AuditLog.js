import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: [true, "Action is required"],
    },
    resource: {
      type: String,
      required: [true, "Resource is required"],
    },
    status: {
      type: String,
      enum: ["success", "failure"],
      default: "success",
    },
    ipAddress: String,
  },
  {
    timestamps: true,
  }
);

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
