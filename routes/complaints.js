import express from "express";
import { body, validationResult } from "express-validator";
import Complaint from "../models/Complaint.js";
import Notification from "../models/Notification.js";
import { protect, authorize } from "../middleware/auth.js";
import createAuditLog from "../utils/createAuditLog.js";
import { notifyAdminsAndStaff } from "../utils/createNotification.js";

const router = express.Router();

// @route   GET /api/complaints
// @desc    Get all complaints (filtered by role) with optional pagination
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    let query = {};

    // Residents can only see their own complaints
    if (req.user.role === "resident") {
      query.userId = req.user._id;
    }

    // Status filter
    if (req.query.status && req.query.status !== "all") {
      query.status = req.query.status;
    }

    // Category filter
    if (req.query.category && req.query.category !== "all") {
      query.category = req.query.category;
    }

    // Priority filter
    if (req.query.priority && req.query.priority !== "all") {
      query.priority = req.query.priority;
    }

    // Search filter (title or description)
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
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
      const totalItems = await Complaint.countDocuments(query);
      const totalPages = Math.ceil(totalItems / limit);

      const complaints = await Complaint.find(query)
        .populate("userId", "firstName lastName email avatar role")
        .populate("assignedTo", "firstName lastName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return res.json({
        data: complaints,
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

    // No pagination - return all results (backward compatible)
    const complaints = await Complaint.find(query)
      .populate("userId", "firstName lastName email avatar role")
      .populate("assignedTo", "firstName lastName")
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (error) {
    console.error("Get complaints error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
});

// @route   POST /api/complaints
// @desc    Create a new complaint
// @access  Private
router.post(
  "/",
  protect,
  [
    body("title")
      .notEmpty()
      .withMessage("Title is required")
      .trim()
      .isLength({ min: 5, max: 150 })
      .withMessage("Title must be between 5 and 150 characters"),
    body("description")
      .notEmpty()
      .withMessage("Description is required")
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage("Description must be between 10 and 1000 characters"),
    body("category")
      .notEmpty()
      .withMessage("Category is required")
      .isIn([
        "Infrastructure",
        "Sanitation",
        "Security",
        "Noise",
        "Lighting",
        "Drainage",
        "Road",
        "Other",
      ])
      .withMessage("Invalid category"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Invalid priority level"),
    body("attachments")
      .optional()
      .isArray()
      .withMessage("Attachments must be an array"),
  ],
  async (req, res) => {
    // Validate request
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
      const complaint = await Complaint.create({
        userId: req.user._id,
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        priority: req.body.priority || "medium",
        attachments: req.body.attachments || [],
      });

      const populatedComplaint = await Complaint.findById(
        complaint._id
      ).populate("userId", "firstName lastName email avatar role");

      await createAuditLog(
        req.user._id,
        "CREATE_COMPLAINT",
        `Complaint #${complaint._id}`,
        "success",
        req.ip
      );

      // Notify all admins and staff about new complaint
      await notifyAdminsAndStaff(
        "New Complaint Submitted",
        `${req.user.firstName} ${req.user.lastName} submitted a new ${req.body.category} complaint: "${req.body.title}"`,
        "info"
      );

      res.status(201).json(populatedComplaint);
    } catch (error) {
      console.error("Create complaint error:", error);
      res.status(500).json({ message: "Server error. Please try again." });
    }
  }
);

// @route   PUT /api/complaints/:id/status
// @desc    Update complaint status
// @access  Private (Staff/Admin)
router.put(
  "/:id/status",
  protect,
  authorize("staff", "admin"),
  [
    body("status")
      .notEmpty()
      .withMessage("Status is required")
      .isIn(["pending", "in-progress", "resolved", "closed"])
      .withMessage("Invalid status"),
    body("note")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Note must not exceed 500 characters"),
  ],
  async (req, res) => {
    // Validate request
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
      const complaint = await Complaint.findById(req.params.id);

      if (!complaint) {
        return res.status(404).json({ message: "Complaint not found" });
      }

      const oldStatus = complaint.status;
      complaint.status = req.body.status;
      complaint.history.push({
        action: `Status Updated to ${req.body.status}`,
        by: `${req.user.firstName} ${req.user.lastName}`,
        timestamp: new Date(),
        note: req.body.note,
      });

      await complaint.save();
      await createAuditLog(
        req.user._id,
        "UPDATE_COMPLAINT_STATUS",
        `Complaint #${complaint._id}`,
        "success",
        req.ip
      );

      // Create notification for the complaint owner
      if (complaint.userId.toString() !== req.user._id.toString()) {
        const statusMessages = {
          pending: "Your complaint is pending review",
          "in-progress": "Your complaint is now being addressed",
          resolved: "Your complaint has been resolved",
          closed: "Your complaint has been closed",
        };

        await Notification.create({
          userId: complaint.userId,
          title: "Complaint Status Updated",
          message: `Your complaint "${
            complaint.title
          }" status changed from ${oldStatus} to ${req.body.status}. ${
            req.body.note ? req.body.note : statusMessages[req.body.status]
          }`,
          type:
            req.body.status === "resolved"
              ? "success"
              : req.body.status === "closed"
              ? "info"
              : "warning",
        });
      }

      res.json(complaint);
    } catch (error) {
      console.error("Update complaint status error:", error);
      res.status(500).json({ message: "Server error. Please try again." });
    }
  }
);

// @route   POST /api/complaints/bulk-status
// @desc    Bulk update complaint statuses
// @access  Private (Staff/Admin)
router.post(
  "/bulk-status",
  protect,
  authorize("staff", "admin"),
  [
    body("ids")
      .isArray({ min: 1 })
      .withMessage("At least one complaint ID is required"),
    body("ids.*").isMongoId().withMessage("Invalid complaint ID format"),
    body("status")
      .notEmpty()
      .withMessage("Status is required")
      .isIn(["pending", "in-progress", "resolved", "closed"])
      .withMessage("Invalid status"),
    body("note")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Note must not exceed 500 characters"),
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

    const { ids, status, note } = req.body;
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    try {
      for (const id of ids) {
        try {
          const complaint = await Complaint.findById(id);

          if (!complaint) {
            results.push({ id, success: false, error: "Complaint not found" });
            failedCount++;
            continue;
          }

          const oldStatus = complaint.status;
          complaint.status = status;
          complaint.history.push({
            action: `Status Updated to ${status}`,
            by: `${req.user.firstName} ${req.user.lastName}`,
            timestamp: new Date(),
            note: note || `Bulk status update`,
          });

          await complaint.save();

          // Create notification for the complaint owner
          if (complaint.userId.toString() !== req.user._id.toString()) {
            const statusMessages = {
              pending: "Your complaint is pending review",
              "in-progress": "Your complaint is now being addressed",
              resolved: "Your complaint has been resolved",
              closed: "Your complaint has been closed",
            };

            await Notification.create({
              userId: complaint.userId,
              title: "Complaint Status Updated",
              message: `Your complaint "${
                complaint.title
              }" status changed from ${oldStatus} to ${status}. ${
                note ? note : statusMessages[status]
              }`,
              type:
                status === "resolved"
                  ? "success"
                  : status === "closed"
                  ? "info"
                  : "warning",
            });
          }

          results.push({ id, success: true });
          successCount++;
        } catch (err) {
          results.push({ id, success: false, error: err.message });
          failedCount++;
        }
      }

      await createAuditLog(
        req.user._id,
        "BULK_UPDATE_COMPLAINT_STATUS",
        `Updated ${successCount} complaints to ${status}`,
        successCount > 0 ? "success" : "failed",
        req.ip
      );

      res.json({
        success: failedCount === 0,
        updated: successCount,
        failed: failedCount,
        results,
      });
    } catch (error) {
      console.error("Bulk update complaints error:", error);
      res.status(500).json({ message: "Server error. Please try again." });
    }
  }
);

// @route   POST /api/complaints/:id/comments
// @desc    Add comment to complaint
// @access  Private
router.post(
  "/:id/comments",
  protect,
  [
    body("message")
      .notEmpty()
      .withMessage("Message is required")
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage("Message must be between 1 and 500 characters"),
  ],
  async (req, res) => {
    // Validate request
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
      const complaint = await Complaint.findById(req.params.id);

      if (!complaint) {
        return res.status(404).json({ message: "Complaint not found" });
      }

      // Check if user has access to this complaint
      if (
        req.user.role === "resident" &&
        complaint.userId.toString() !== req.user._id.toString()
      ) {
        return res
          .status(403)
          .json({ message: "Not authorized to comment on this complaint" });
      }

      const comment = {
        userId: req.user._id,
        userName: `${req.user.firstName} ${req.user.lastName}`,
        userRole: req.user.role,
        message: req.body.message,
        timestamp: new Date(),
      };

      complaint.comments.push(comment);
      await complaint.save();

      res.status(201).json(comment);
    } catch (error) {
      console.error("Add comment error:", error);
      res.status(500).json({ message: "Server error. Please try again." });
    }
  }
);

// @route   GET /api/complaints/export
// @desc    Export complaints data as CSV
// @access  Private (Staff/Admin)
router.get(
  "/export",
  protect,
  authorize("staff", "admin"),
  async (req, res) => {
    try {
      let query = {};

      // Status filter
      if (req.query.status && req.query.status !== "all") {
        query.status = req.query.status;
      }

      // Category filter
      if (req.query.category && req.query.category !== "all") {
        query.category = req.query.category;
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

      // Specific IDs filter
      if (req.query.ids) {
        const ids = req.query.ids.split(",");
        query._id = { $in: ids };
      }

      const complaints = await Complaint.find(query)
        .populate("userId", "firstName lastName email")
        .populate("assignedTo", "firstName lastName")
        .sort({ createdAt: -1 });

      const format = req.query.format || "csv";

      if (format === "csv") {
        // Generate CSV
        const headers = [
          "ID",
          "Title",
          "Description",
          "Category",
          "Status",
          "Priority",
          "Submitted By",
          "Email",
          "Assigned To",
          "Created At",
          "Updated At",
        ];

        const rows = complaints.map((c) => [
          c._id.toString(),
          `"${(c.title || "").replace(/"/g, '""')}"`,
          `"${(c.description || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
          c.category || "",
          c.status || "",
          c.priority || "",
          c.userId ? `${c.userId.firstName} ${c.userId.lastName}` : "",
          c.userId?.email || "",
          c.assignedTo
            ? `${c.assignedTo.firstName} ${c.assignedTo.lastName}`
            : "",
          c.createdAt ? new Date(c.createdAt).toISOString() : "",
          c.updatedAt ? new Date(c.updatedAt).toISOString() : "",
        ]);

        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
          "\n"
        );

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="complaints-export-${Date.now()}.csv"`
        );
        return res.send(csv);
      }

      // JSON format (for PDF generation on frontend)
      res.json(complaints);
    } catch (error) {
      console.error("Export complaints error:", error);
      res.status(500).json({ message: "Server error. Please try again." });
    }
  }
);

export default router;
