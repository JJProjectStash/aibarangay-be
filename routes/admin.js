import express from "express";
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
// @desc    Get all audit logs
// @access  Private (Admin)
router.get("/audit-logs", protect, authorize("admin"), async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate("userId", "firstName lastName email role")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(logs);
  } catch (error) {
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
