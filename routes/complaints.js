import express from "express";
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
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/complaints
// @desc    Create a new complaint
// @access  Private
router.post("/", protect, async (req, res) => {
  try {
    const complaint = await Complaint.create({
      userId: req.user._id,
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      priority: req.body.priority || "medium",
      attachments: req.body.attachments || [],
    });

    const populatedComplaint = await Complaint.findById(complaint._id).populate(
      "userId",
      "firstName lastName email avatar role"
    );

    await createAuditLog(
      req.user._id,
      "CREATE_COMPLAINT",
      `Complaint #${complaint._id}`,
      "success",
      req.ip
    );

    res.status(201).json(populatedComplaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/complaints/:id/status
// @desc    Update complaint status
// @access  Private (Staff/Admin)
router.put(
  "/:id/status",
  protect,
  authorize("staff", "admin"),
  async (req, res) => {
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
      res.status(500).json({ message: error.message });
    }
  }
);

// @route   POST /api/complaints/:id/comments
// @desc    Add comment to complaint
// @access  Private
router.post("/:id/comments", protect, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
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
    res.status(500).json({ message: error.message });
  }
});

export default router;
