import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      next();
    } catch (error) {
      // Handle token expiration separately for frontend handling
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ 
          message: "Token expired", 
          code: "TOKEN_EXPIRED" 
        });
      }
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};

/**
 * Middleware to restrict access to residents only
 * Used for creating complaints and service requests
 */
export const residentOnly = (req, res, next) => {
  if (req.user.role !== "resident") {
    return res.status(403).json({
      message:
        "Only residents can submit requests. Staff and admins can only manage existing requests.",
    });
  }
  next();
};

/**
 * Middleware to restrict access to staff or admin only
 */
export const staffOrAdmin = (req, res, next) => {
  if (!["staff", "admin"].includes(req.user.role)) {
    return res.status(403).json({
      message: "Only staff and admin can perform this action",
    });
  }
  next();
};
