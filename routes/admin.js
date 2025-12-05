import express from "express";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import SiteSettings from "../models/SiteSettings.js";
import { protect, authorize } from "../middleware/auth.js";
import createAuditLog from "../utils/createAuditLog.js";

const router = express.Router();

// ========== USERS ==========

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Admin)
router.get("/users", protect, authorize("admin"), async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user (role, verification status)
// @access  Private (Admin)
router.put(
  "/users/:id",
  protect,
  authorize("admin"),
  [
    body("role")
      .optional()
      .isIn(["resident", "staff", "admin"])
      .withMessage("Invalid role"),
    body("isVerified")
      .optional()
      .isBoolean()
      .withMessage("isVerified must be a boolean"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors
          .array()
          .map((err) => ({ field: err.path, message: err.msg })),
      });
    }

    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent modifying self if changing role
      if (req.body.role && user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: "Cannot change your own role" });
      }

      // Update fields
      if (req.body.role !== undefined) user.role = req.body.role;
      if (req.body.isVerified !== undefined) {
        const wasVerified = user.isVerified;
        user.isVerified = req.body.isVerified;

        // Log verification status change
        if (wasVerified !== req.body.isVerified) {
          await createAuditLog(
            req.user._id,
            req.body.isVerified ? "USER_VERIFIED" : "USER_UNVERIFIED",
            `User #${user._id}`,
            "success",
            req.ip
          );
        }
      }

      const updatedUser = await user.save();

      await createAuditLog(
        req.user._id,
        "UPDATE_USER",
        `User #${user._id}`,
        "success",
        req.ip
      );

      res.json({
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        address: updatedUser.address,
        phoneNumber: updatedUser.phoneNumber,
        isVerified: updatedUser.isVerified,
        idDocumentUrl: updatedUser.idDocumentUrl,
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user
// @access  Private (Admin)
router.delete("/users/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent deleting self
    if (user._id.toString() === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "Cannot delete your own account" });
    }

    await user.deleteOne();
    await createAuditLog(
      req.user._id,
      "DELETE_USER",
      `User #${user._id}`,
      "success",
      req.ip
    );

    res.json({ message: "User removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== AUDIT LOGS ==========

// @route   GET /api/admin/audit-logs
// @desc    Get all audit logs with optional pagination and filtering
// @access  Private (Admin)
router.get("/audit-logs", protect, authorize("admin"), async (req, res) => {
  try {
    let query = {};

    // Action filter
    if (req.query.action && req.query.action !== "all") {
      query.action = new RegExp(req.query.action, "i");
    }

    // Status filter
    if (req.query.status && req.query.status !== "all") {
      query.status = req.query.status;
    }

    // Search filter (action or details)
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [{ action: searchRegex }, { details: searchRegex }];
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    // Check if pagination is requested
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 0;

    if (page > 0 && limit > 0) {
      // Server-side pagination
      const skip = (page - 1) * limit;
      const totalItems = await AuditLog.countDocuments(query);
      const totalPages = Math.ceil(totalItems / limit);

      const logs = await AuditLog.find(query)
        .populate("userId", "firstName lastName email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return res.json({
        data: logs,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          pageSize: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    }

    // No pagination - return limited results (backward compatible)
    const logs = await AuditLog.find(query)
      .populate("userId", "firstName lastName email role")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/admin/audit-logs/export
// @desc    Export audit logs as CSV
// @access  Private (Admin)
router.get(
  "/audit-logs/export",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      let query = {};

      // Action filter
      if (req.query.action && req.query.action !== "all") {
        query.action = new RegExp(req.query.action, "i");
      }

      // Status filter
      if (req.query.status && req.query.status !== "all") {
        query.status = req.query.status;
      }

      // Date range filter
      if (req.query.startDate || req.query.endDate) {
        query.createdAt = {};
        if (req.query.startDate) {
          query.createdAt.$gte = new Date(req.query.startDate);
        }
        if (req.query.endDate) {
          query.createdAt.$lte = new Date(req.query.endDate);
        }
      }

      const logs = await AuditLog.find(query)
        .populate("userId", "firstName lastName email role")
        .sort({ createdAt: -1 });

      const format = req.query.format || "csv";

      if (format === "csv") {
        // Generate CSV
        const headers = [
          "ID",
          "Action",
          "Details",
          "Status",
          "User",
          "Email",
          "Role",
          "IP Address",
          "Timestamp",
        ];

        const rows = logs.map((log) => [
          log._id.toString(),
          log.action || "",
          `"${(log.details || "").replace(/"/g, '""')}"`,
          log.status || "",
          log.userId ? `${log.userId.firstName} ${log.userId.lastName}` : "",
          log.userId?.email || "",
          log.userId?.role || "",
          log.ipAddress || "",
          log.createdAt ? new Date(log.createdAt).toISOString() : "",
        ]);

        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
          "\n"
        );

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="audit-logs-export-${Date.now()}.csv"`
        );
        return res.send(csv);
      }

      // JSON format
      res.json(logs);
    } catch (error) {
      console.error("Export audit logs error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// @route   GET /api/admin/users/export
// @desc    Export users as CSV
// @access  Private (Admin)
router.get("/users/export", protect, authorize("admin"), async (req, res) => {
  try {
    let query = {};

    // Role filter
    if (req.query.role && req.query.role !== "all") {
      query.role = req.query.role;
    }

    // Verification status filter
    if (req.query.isVerified !== undefined) {
      query.isVerified = req.query.isVerified === "true";
    }

    // Search filter
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    const format = req.query.format || "csv";

    if (format === "csv") {
      // Generate CSV
      const headers = [
        "ID",
        "First Name",
        "Last Name",
        "Email",
        "Role",
        "Verified",
        "Phone Number",
        "Address",
        "Created At",
      ];

      const rows = users.map((user) => [
        user._id.toString(),
        `"${(user.firstName || "").replace(/"/g, '""')}"`,
        `"${(user.lastName || "").replace(/"/g, '""')}"`,
        user.email || "",
        user.role || "",
        user.isVerified ? "Yes" : "No",
        user.phoneNumber || "",
        `"${(user.address || "").replace(/"/g, '""')}"`,
        user.createdAt ? new Date(user.createdAt).toISOString() : "",
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n"
      );

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="users-export-${Date.now()}.csv"`
      );
      return res.send(csv);
    }

    // JSON format
    res.json(users);
  } catch (error) {
    console.error("Export users error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ========== SITE SETTINGS ==========

// @route   GET /api/admin/settings
// @desc    Get site settings
// @access  Public
router.get("/settings", async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();

    // Create default settings if none exist
    if (!settings) {
      settings = await SiteSettings.create({
        barangayName: "Barangay San Isidro",
        logoUrl: "https://cdn-icons-png.flaticon.com/512/921/921356.png",
        contactEmail: "help@ibarangay.com",
        contactPhone: "(02) 8123-4567",
        address: "123 Rizal St, Barangay San Isidro, Quezon City",
        facebookUrl: "https://facebook.com",
        twitterUrl: "https://twitter.com",
      });
    }

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/admin/settings
// @desc    Update site settings
// @access  Private (Admin)
router.put("/settings", protect, authorize("admin"), async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();

    if (settings) {
      settings.barangayName = req.body.barangayName || settings.barangayName;
      settings.logoUrl = req.body.logoUrl || settings.logoUrl;
      settings.contactEmail = req.body.contactEmail || settings.contactEmail;
      settings.contactPhone = req.body.contactPhone || settings.contactPhone;
      settings.address = req.body.address || settings.address;
      settings.facebookUrl = req.body.facebookUrl || settings.facebookUrl;
      settings.twitterUrl = req.body.twitterUrl || settings.twitterUrl;

      await settings.save();
    } else {
      settings = await SiteSettings.create(req.body);
    }

    await createAuditLog(
      req.user._id,
      "UPDATE_SETTINGS",
      "Site Settings",
      "success",
      req.ip
    );

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
