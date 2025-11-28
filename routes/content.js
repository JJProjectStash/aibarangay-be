import express from "express";
import Hotline from "../models/Hotline.js";
import Official from "../models/Official.js";
import FAQ from "../models/FAQ.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// ========== HOTLINES ==========

// @route   GET /api/content/hotlines
// @desc    Get all hotlines
// @access  Public
router.get("/hotlines", async (req, res) => {
  try {
    const hotlines = await Hotline.find().sort({ category: 1 });
    res.json(hotlines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/content/hotlines
// @desc    Create a hotline
// @access  Private (Staff/Admin)
router.post(
  "/hotlines",
  protect,
  authorize("staff", "admin"),
  async (req, res) => {
    try {
      const hotline = await Hotline.create(req.body);
      res.status(201).json(hotline);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// @route   DELETE /api/content/hotlines/:id
// @desc    Delete a hotline
// @access  Private (Staff/Admin)
router.delete(
  "/hotlines/:id",
  protect,
  authorize("staff", "admin"),
  async (req, res) => {
    try {
      const hotline = await Hotline.findById(req.params.id);
      if (!hotline) {
        return res.status(404).json({ message: "Hotline not found" });
      }
      await hotline.deleteOne();
      res.json({ message: "Hotline removed" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// ========== OFFICIALS ==========

// @route   GET /api/content/officials
// @desc    Get all officials
// @access  Public
router.get("/officials", async (req, res) => {
  try {
    const officials = await Official.find().sort({ createdAt: 1 });
    res.json(officials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/content/officials
// @desc    Create an official
// @access  Private (Staff/Admin)
router.post(
  "/officials",
  protect,
  authorize("staff", "admin"),
  async (req, res) => {
    try {
      const official = await Official.create(req.body);
      res.status(201).json(official);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// @route   DELETE /api/content/officials/:id
// @desc    Delete an official
// @access  Private (Staff/Admin)
router.delete(
  "/officials/:id",
  protect,
  authorize("staff", "admin"),
  async (req, res) => {
    try {
      const official = await Official.findById(req.params.id);
      if (!official) {
        return res.status(404).json({ message: "Official not found" });
      }
      await official.deleteOne();
      res.json({ message: "Official removed" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// ========== FAQs ==========

// @route   GET /api/content/faqs
// @desc    Get all FAQs
// @access  Public
router.get("/faqs", async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ category: 1 });
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/content/faqs
// @desc    Create a FAQ
// @access  Private (Staff/Admin)
router.post("/faqs", protect, authorize("staff", "admin"), async (req, res) => {
  try {
    const faq = await FAQ.create(req.body);
    res.status(201).json(faq);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/content/faqs/:id
// @desc    Delete a FAQ
// @access  Private (Staff/Admin)
router.delete(
  "/faqs/:id",
  protect,
  authorize("staff", "admin"),
  async (req, res) => {
    try {
      const faq = await FAQ.findById(req.params.id);
      if (!faq) {
        return res.status(404).json({ message: "FAQ not found" });
      }
      await faq.deleteOne();
      res.json({ message: "FAQ removed" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;
