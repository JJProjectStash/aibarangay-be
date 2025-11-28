import express from "express";
import NewsItem from "../models/NewsItem.js";
import { protect, authorize } from "../middleware/auth.js";
import createAuditLog from "../utils/createAuditLog.js";

const router = express.Router();

// @route   GET /api/news
// @desc    Get all news items
// @access  Public
router.get("/", async (req, res) => {
  try {
    const news = await NewsItem.find().sort({ createdAt: -1 });
    res.json(news);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/news
// @desc    Create a news item
// @access  Private (Staff/Admin)
router.post("/", protect, authorize("staff", "admin"), async (req, res) => {
  try {
    const newsItem = await NewsItem.create({
      title: req.body.title,
      summary: req.body.summary,
      content: req.body.content,
      imageUrl: req.body.imageUrl,
      author: req.body.author || `${req.user.firstName} ${req.user.lastName}`,
    });

    await createAuditLog(
      req.user._id,
      "CREATE_NEWS",
      `News #${newsItem._id}`,
      "success",
      req.ip
    );

    res.status(201).json(newsItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/news/:id
// @desc    Delete a news item
// @access  Private (Staff/Admin)
router.delete(
  "/:id",
  protect,
  authorize("staff", "admin"),
  async (req, res) => {
    try {
      const newsItem = await NewsItem.findById(req.params.id);

      if (!newsItem) {
        return res.status(404).json({ message: "News item not found" });
      }

      await newsItem.deleteOne();
      await createAuditLog(
        req.user._id,
        "DELETE_NEWS",
        `News #${newsItem._id}`,
        "success",
        req.ip
      );

      res.json({ message: "News item removed" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;
