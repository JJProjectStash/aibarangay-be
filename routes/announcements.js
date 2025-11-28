import express from "express";
import Announcement from "../models/Announcement.js";
import { protect, authorize } from "../middleware/auth.js";

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

      res.json(announcement);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;
