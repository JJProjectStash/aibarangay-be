import express from "express";
import { body, validationResult } from "express-validator";
import ServiceRequest from "../models/ServiceRequest.js";
import Notification from "../models/Notification.js";
import { protect, authorize, residentOnly } from "../middleware/auth.js";
import createAuditLog from "../utils/createAuditLog.js";
import { notifyAdminsAndStaff } from "../utils/createNotification.js";

const router = express.Router();

// @route   GET /api/services
// @desc    Get all service requests (filtered by role) with optional pagination
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    let query = {};

    // Residents can only see their own requests
    if (req.user.role === "resident") {
      query.userId = req.user._id;
    }

    // Status filter
    if (req.query.status && req.query.status !== "all") {
      query.status = req.query.status;
    }

    // Request type filter (Equipment/Facility)
    if (req.query.type && req.query.type !== "all") {
      query.requestType = req.query.type;
    }

    // Search filter (itemName or purpose)
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [{ itemName: searchRegex }, { purpose: searchRegex }];
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    // Check if pagination is requested
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 0;

    if (page > 0 && limit > 0) {
      // Server-side pagination
      const skip = (page - 1) * limit;
      const totalItems = await ServiceRequest.countDocuments(query);
      const totalPages = Math.ceil(totalItems / limit);

      const services = await ServiceRequest.find(query)
        .populate("userId", "firstName lastName email avatar role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return res.json({
        data: services,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          pageSize: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    }

    // No pagination - return all results (backward compatible)
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
// @access  Private (Residents only)
router.post(
  "/",
  protect,
  residentOnly,
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

      // Notify all admins and staff about new service request
      await notifyAdminsAndStaff(
        "New Service Request",
        `${req.user.firstName} ${req.user.lastName} submitted a new ${req.body.requestType} request: "${req.body.itemName}"`,
        "info"
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
          relatedType: "service",
          relatedId: service._id,
        });
      }

      res.json(service);
    } catch (error) {
      console.error("Update service status error:", error);
      res.status(500).json({ message: "Server error. Please try again." });
    }
  }
);

// @route   POST /api/services/bulk-status
// @desc    Bulk update service request statuses
// @access  Private (Staff/Admin)
router.post(
  "/bulk-status",
  protect,
  authorize("staff", "admin"),
  [
    body("ids")
      .isArray({ min: 1 })
      .withMessage("At least one service request ID is required"),
    body("ids.*").isMongoId().withMessage("Invalid service request ID format"),
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors
          .array()
          .map((err) => ({ field: err.path, message: err.msg })),
      });
    }

    const { ids, status, note } = req.body;
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    // Rejection requires a note
    if (status === "rejected" && !note) {
      return res.status(400).json({
        message: "Rejection reason is required when rejecting requests",
      });
    }

    try {
      for (const id of ids) {
        try {
          const service = await ServiceRequest.findById(id);

          if (!service) {
            results.push({
              id,
              success: false,
              error: "Service request not found",
            });
            failedCount++;
            continue;
          }

          const oldStatus = service.status;
          service.status = status;

          if (status === "rejected") {
            service.rejectionReason = note;
          } else if (status === "approved") {
            service.approvalNote = note;
          }

          await service.save();

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
              }" status changed from ${oldStatus} to ${status}. ${
                note ? note : statusMessages[status]
              }`,
              type:
                status === "approved" || status === "returned"
                  ? "success"
                  : status === "rejected"
                  ? "error"
                  : "info",
              relatedType: "service",
              relatedId: service._id,
            });
          }

          results.push({ id, success: true });
          successCount++;
        } catch (err) {
          results.push({ id, success: false, error: err.message });
          failedCount++;
        }
      }

      await createAuditLog(
        req.user._id,
        "BULK_UPDATE_SERVICE_STATUS",
        `Updated ${successCount} service requests to ${status}`,
        successCount > 0 ? "success" : "failed",
        req.ip
      );

      res.json({
        success: failedCount === 0,
        updated: successCount,
        failed: failedCount,
        results,
      });
    } catch (error) {
      console.error("Bulk update services error:", error);
      res.status(500).json({ message: "Server error. Please try again." });
    }
  }
);

// @route   GET /api/services/export
// @desc    Export service requests data as CSV
// @access  Private (Staff/Admin)
router.get(
  "/export",
  protect,
  authorize("staff", "admin"),
  async (req, res) => {
    try {
      let query = {};

      // Status filter
      if (req.query.status && req.query.status !== "all") {
        query.status = req.query.status;
      }

      // Request type filter
      if (req.query.type && req.query.type !== "all") {
        query.requestType = req.query.type;
      }

      // Date range filter
      if (req.query.startDate || req.query.endDate) {
        query.createdAt = {};
        if (req.query.startDate) {
          query.createdAt.$gte = new Date(req.query.startDate);
        }
        if (req.query.endDate) {
          query.createdAt.$lte = new Date(req.query.endDate);
        }
      }

      // Specific IDs filter
      if (req.query.ids) {
        const ids = req.query.ids.split(",");
        query._id = { $in: ids };
      }

      const services = await ServiceRequest.find(query)
        .populate("userId", "firstName lastName email")
        .sort({ createdAt: -1 });

      const format = req.query.format || "csv";

      if (format === "csv") {
        // Generate CSV
        const headers = [
          "ID",
          "Request Type",
          "Item Name",
          "Item Type",
          "Status",
          "Purpose",
          "Borrow Date",
          "Return Date",
          "Requested By",
          "Email",
          "Notes",
          "Created At",
        ];

        const rows = services.map((s) => [
          s._id.toString(),
          s.requestType || "",
          `"${(s.itemName || "").replace(/"/g, '""')}"`,
          s.itemType || "",
          s.status || "",
          `"${(s.purpose || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
          s.borrowDate
            ? new Date(s.borrowDate).toISOString().split("T")[0]
            : "",
          s.expectedReturnDate
            ? new Date(s.expectedReturnDate).toISOString().split("T")[0]
            : "",
          s.userId ? `${s.userId.firstName} ${s.userId.lastName}` : "",
          s.userId?.email || "",
          `"${(s.notes || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
          s.createdAt ? new Date(s.createdAt).toISOString() : "",
        ]);

        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
          "\n"
        );

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="services-export-${Date.now()}.csv"`
        );
        return res.send(csv);
      }

      // JSON format (for PDF generation on frontend)
      res.json(services);
    } catch (error) {
      console.error("Export services error:", error);
      res.status(500).json({ message: "Server error. Please try again." });
    }
  }
);

export default router;
