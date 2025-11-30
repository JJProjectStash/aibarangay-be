import AuditLog from "../models/AuditLog.js";

export const createAuditLog = async (
  userId,
  action,
  resource,
  details = {},
  status = "success",
  ipAddress = null
) => {
  try {
    const auditLog = new AuditLog({
      userId,
      action,
      resource,
      details: typeof details === "string" ? { message: details } : details,
      status,
      ipAddress,
    });
    await auditLog.save();
    return auditLog;
  } catch (error) {
    console.error("Error creating audit log:", error);
    // Don't throw error to prevent disrupting main operation
    return null;
  }
};

export default createAuditLog;
