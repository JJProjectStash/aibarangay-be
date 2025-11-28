import AuditLog from "../models/AuditLog.js";

const createAuditLog = async (
  userId,
  action,
  resource,
  status = "success",
  ipAddress = null
) => {
  try {
    await AuditLog.create({
      userId,
      action,
      resource,
      status,
      ipAddress,
    });
  } catch (error) {
    console.error("Error creating audit log:", error);
  }
};

export default createAuditLog;
