import express from "express";
import { protect } from "../middleware/auth.js";
import Complaint from "../models/Complaint.js";
import ServiceRequest from "../models/ServiceRequest.js";
import Event from "../models/Event.js";
import User from "../models/User.js";

const router = express.Router();

// @route   GET /api/stats
// @desc    Get dashboard statistics (role-based)
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    // Admin/Staff View: System-wide stats
    if (req.user.role === "admin" || req.user.role === "staff") {
      const totalResidents = await User.countDocuments({ role: "resident" });
      const pendingComplaints = await Complaint.countDocuments({
        status: "pending",
      });
      const activeServices = await ServiceRequest.countDocuments({
        status: { $in: ["approved", "borrowed"] },
      });
      const upcomingEvents = await Event.countDocuments({ status: "upcoming" });
      const resolvedComplaints = await Complaint.countDocuments({
        status: "resolved",
      });

      return res.json({
        totalResidents,
        pendingComplaints,
        activeServices,
        upcomingEvents,
        resolvedComplaints,
      });
    }

    // Resident View: Personal stats
    const myPendingComplaints = await Complaint.countDocuments({
      userId: req.user._id,
      status: "pending",
    });
    const myActiveServices = await ServiceRequest.countDocuments({
      userId: req.user._id,
      status: { $in: ["approved", "borrowed"] },
    });
    const upcomingEvents = await Event.countDocuments({ status: "upcoming" });
    const myTotalComplaints = await Complaint.countDocuments({
      userId: req.user._id,
    });

    res.json({
      myPendingComplaints,
      myActiveServices,
      upcomingEvents,
      myTotalComplaints,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
