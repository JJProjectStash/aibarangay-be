import AuditLog from "../models/AuditLog.js";

export const createAuditLog = async (
  userId,
  action,
  resource,
  details,
  status,
  ipAddress
) => {
  try {
    const auditLog = new AuditLog({
      userId,
      action,
      resource,
      details,
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
