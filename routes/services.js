import express from "express";
import { body, validationResult } from "express-validator";
import ServiceRequest from "../models/ServiceRequest.js";
import Notification from "../models/Notification.js";
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
    console.error("Get services error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
});

// @route   POST /api/services
// @desc    Create a new service request
// @access  Private
router.post(
  "/",
  protect,
  [
    body("requestType")
      .notEmpty()
      .withMessage("Request type is required")
      .isIn(["Equipment", "Facility"])
      .withMessage("Request type must be either Equipment or Facility"),
    body("itemName")
      .notEmpty()
      .withMessage("Item/Facility name is required")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be between 2 and 100 characters"),
    body("itemType")
      .notEmpty()
      .withMessage("Type is required")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Type must be between 2 and 100 characters"),
    body("borrowDate")
      .notEmpty()
      .withMessage("Start date is required")
      .isISO8601()
      .withMessage("Invalid start date format")
      .custom((value) => {
        const borrowDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (borrowDate < today) {
          throw new Error("Start date cannot be in the past");
        }
        return true;
      }),
    body("expectedReturnDate")
      .notEmpty()
      .withMessage("End date is required")
      .isISO8601()
      .withMessage("Invalid end date format")
      .custom((value, { req }) => {
        const returnDate = new Date(value);
        const borrowDate = new Date(req.body.borrowDate);
        if (returnDate < borrowDate) {
          throw new Error("End date must be on or after start date");
        }
        return true;
      }),
    body("purpose")
      .notEmpty()
      .withMessage("Purpose is required")
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage("Purpose must be between 10 and 500 characters"),
    body("timeSlot")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Time slot must not exceed 100 characters"),
    body("numberOfPeople")
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage("Number of people must be between 1 and 10000"),
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Notes must not exceed 500 characters"),
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
      const serviceData = {
        userId: req.user._id,
        requestType: req.body.requestType,
        itemName: req.body.itemName,
        itemType: req.body.itemType,
        borrowDate: req.body.borrowDate,
        expectedReturnDate: req.body.expectedReturnDate,
        purpose: req.body.purpose,
        notes: req.body.notes,
      };

      // Add facility-specific fields if request type is Facility
      if (req.body.requestType === "Facility") {
        if (req.body.timeSlot) {
          serviceData.timeSlot = req.body.timeSlot;
        }
        if (req.body.numberOfPeople) {
          serviceData.numberOfPeople = req.body.numberOfPeople;
        }
      }

      const service = await ServiceRequest.create(serviceData);

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
      console.error("Create service error:", error);
      res.status(500).json({ message: "Server error. Please try again." });
    }
  }
);

// @route   PUT /api/services/:id/status
// @desc    Update service request status
// @access  Private (Staff/Admin)
router.put(
  "/:id/status",
  protect,
  authorize("staff", "admin"),
  [
    body("status")
      .notEmpty()
      .withMessage("Status is required")
      .isIn(["pending", "approved", "borrowed", "returned", "rejected"])
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
      const service = await ServiceRequest.findById(req.params.id);

      if (!service) {
        return res.status(404).json({ message: "Service request not found" });
      }

      const oldStatus = service.status;
      service.status = req.body.status;

      if (req.body.status === "rejected") {
        if (!req.body.note) {
          return res.status(400).json({
            message: "Rejection reason is required when rejecting a request",
          });
        }
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

      // Create notification for the service request owner
      if (service.userId.toString() !== req.user._id.toString()) {
        const statusMessages = {
          pending: "Your service request is pending review",
          approved: "Your service request has been approved",
          borrowed: "Your service request is now active",
          returned: "Your service request has been completed",
          rejected: "Your service request has been rejected",
        };

        await Notification.create({
          userId: service.userId,
          title: "Service Request Status Updated",
          message: `Your ${service.requestType.toLowerCase()} request "${
            service.itemName
          }" status changed from ${oldStatus} to ${req.body.status}. ${
            req.body.note ? req.body.note : statusMessages[req.body.status]
          }`,
          type:
            req.body.status === "approved" || req.body.status === "returned"
              ? "success"
              : req.body.status === "rejected"
              ? "error"
              : "info",
        });
      }

      res.json(service);
    } catch (error) {
      console.error("Update service status error:", error);
      res.status(500).json({ message: "Server error. Please try again." });
    }
  }
);

export default router;
