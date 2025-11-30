import express from "express";
import { body, validationResult } from "express-validator";
import Complaint from "../models/Complaint.js";
import { protect, authorize } from "../middleware/auth.js";
import createAuditLog from "../utils/createAuditLog.js";

const router = express.Router();

// @route   GET /api/complaints
// @desc    Get all complaints (filtered by role)
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    let query = {};

    // Residents can only see their own complaints
    if (req.user.role === "resident") {
      query.userId = req.user._id;
    }

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
        "Sanitation",
        "Noise Disturbance",
        "Maintenance",
        "Security",
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

      res.json(complaint);
    } catch (error) {
      console.error("Update complaint status error:", error);
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

export default router;
