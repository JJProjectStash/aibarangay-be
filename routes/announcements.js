import express from "express";
import Announcement from "../models/Announcement.js";
import { protect, authorize } from "../middleware/auth.js";
import { createAuditLog } from "../utils/createAuditLog.js";

const router = express.Router();

// @route   GET /api/announcements
// @desc    Get all announcements
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const announcements = await Announcement.find({ isPublished: true }).sort({
      isPinned: -1,
      createdAt: -1,
    });

    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/announcements
// @desc    Create a new announcement
// @access  Private (Staff/Admin)
router.post("/", protect, authorize("staff", "admin"), async (req, res) => {
  try {
    const { title, content, category, priority } = req.body;

    // Validation
    if (!title || !content) {
      return res
        .status(400)
        .json({ message: "Title and content are required" });
    }

    if (title.length < 5 || title.length > 200) {
      return res
        .status(400)
        .json({ message: "Title must be between 5 and 200 characters" });
    }

    if (content.length < 20 || content.length > 2000) {
      return res
        .status(400)
        .json({ message: "Content must be between 20 and 2000 characters" });
    }

    const validCategories = [
      "general",
      "emergency",
      "event",
      "maintenance",
      "policy",
    ];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const validPriorities = ["low", "medium", "high", "urgent"];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ message: "Invalid priority" });
    }

    const announcement = new Announcement({
      title: title.trim(),
      content: content.trim(),
      category: category || "general",
      priority: priority || "medium",
      author: `${req.user.firstName} ${req.user.lastName}`,
      isPublished: true,
      isPinned: false,
      views: 0,
    });

    await announcement.save();

    // Create audit log
    await createAuditLog(
      req.user._id,
      "create",
      "announcement",
      `Created announcement: ${title}`,
      "success",
      req.ip
    );

    res.status(201).json(announcement);
  } catch (error) {
    console.error("Create announcement error:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to create announcement" });
  }
});

// @route   PUT /api/announcements/:id/pin
// @desc    Toggle announcement pin status
// @access  Private (Staff/Admin)
router.put(
  "/:id/pin",
  protect,
  authorize("staff", "admin"),
  async (req, res) => {
    try {
      const announcement = await Announcement.findById(req.params.id);

      if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
      }

      announcement.isPinned = !announcement.isPinned;
      await announcement.save();

      // Create audit log
      await createAuditLog(
        req.user._id,
        "update",
        "announcement",
        `${announcement.isPinned ? "Pinned" : "Unpinned"} announcement: ${
          announcement.title
        }`,
        "success",
        req.ip
      );

      res.json(announcement);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// @route   DELETE /api/announcements/:id
// @desc    Delete an announcement
// @access  Private (Admin only)
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    await announcement.deleteOne();

    // Create audit log
    await createAuditLog(
      req.user._id,
      "delete",
      "announcement",
      `Deleted announcement: ${announcement.title}`,
      "success",
      req.ip
    );

    res.json({ message: "Announcement deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
