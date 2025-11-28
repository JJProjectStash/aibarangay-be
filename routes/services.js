import express from "express";
import ServiceRequest from "../models/ServiceRequest.js";
import { protect, authorize } from "../middleware/auth.js";
import createAuditLog from "../utils/createAuditLog.js";

const router = express.Router();

// @route   GET /api/services
// @desc    Get all service requests (filtered by role)
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    let query = {};

    // Residents can only see their own requests
    if (req.user.role === "resident") {
      query.userId = req.user._id;
    }

    const services = await ServiceRequest.find(query)
      .populate("userId", "firstName lastName email avatar role")
      .sort({ createdAt: -1 });

    res.json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/services
// @desc    Create a new service request
// @access  Private
router.post("/", protect, async (req, res) => {
  try {
    const service = await ServiceRequest.create({
      userId: req.user._id,
      itemName: req.body.itemName,
      itemType: req.body.itemType,
      borrowDate: req.body.borrowDate,
      expectedReturnDate: req.body.expectedReturnDate,
      purpose: req.body.purpose,
      notes: req.body.notes,
    });

    const populatedService = await ServiceRequest.findById(
      service._id
    ).populate("userId", "firstName lastName email avatar role");

    await createAuditLog(
      req.user._id,
      "CREATE_SERVICE_REQUEST",
      `Service #${service._id}`,
      "success",
      req.ip
    );

    res.status(201).json(populatedService);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/services/:id/status
// @desc    Update service request status
// @access  Private (Staff/Admin)
router.put(
  "/:id/status",
  protect,
  authorize("staff", "admin"),
  async (req, res) => {
    try {
      const service = await ServiceRequest.findById(req.params.id);

      if (!service) {
        return res.status(404).json({ message: "Service request not found" });
      }

      service.status = req.body.status;

      if (req.body.status === "rejected") {
        service.rejectionReason = req.body.note;
      } else if (req.body.status === "approved") {
        service.approvalNote = req.body.note;
      }

      await service.save();
      await createAuditLog(
        req.user._id,
        "UPDATE_SERVICE_STATUS",
        `Service #${service._id}`,
        "success",
        req.ip
      );

      res.json(service);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;
