import express from "express";
import Notification from "../models/Notification.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user._id,
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put("/read-all", protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
