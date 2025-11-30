import express from "express";
import Event from "../models/Event.js";
import User from "../models/User.js";
import { protect, authorize } from "../middleware/auth.js";
import createAuditLog from "../utils/createAuditLog.js";
import { notifyAdminsAndStaff } from "../utils/createNotification.js";

const router = express.Router();

// @route   GET /api/events
// @desc    Get all events
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const events = await Event.find()
      .populate("organizerId", "firstName lastName")
      .sort({ eventDate: 1 });

    // Add isRegistered flag for current user
    const eventsWithRegistration = events.map((event) => {
      const eventObj = event.toObject();
      eventObj.isRegistered = event.registeredUsers.some(
        (userId) => userId.toString() === req.user._id.toString()
      );
      return eventObj;
    });

    res.json(eventsWithRegistration);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/events/:id/registered
// @desc    Get registered users for an event
// @access  Private (Staff/Admin)
router.get(
  "/:id/registered",
  protect,
  authorize("staff", "admin"),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id).populate(
        "registeredUsers",
        "firstName lastName email phoneNumber address avatar role isVerified"
      );

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.json(event.registeredUsers);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// @route   POST /api/events
// @desc    Create a new event
// @access  Private (Staff/Admin)
router.post("/", protect, authorize("staff", "admin"), async (req, res) => {
  try {
    const event = await Event.create({
      title: req.body.title,
      description: req.body.description,
      eventDate: req.body.eventDate,
      location: req.body.location,
      organizerId: req.user._id,
      maxAttendees: req.body.maxAttendees,
      category: req.body.category,
      imageUrl: req.body.imageUrl,
    });

    await createAuditLog(
      req.user._id,
      "CREATE_EVENT",
      `Event #${event._id}`,
      "success",
      req.ip
    );

    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/events/:id
// @desc    Delete an event
// @access  Private (Staff/Admin)
router.delete(
  "/:id",
  protect,
  authorize("staff", "admin"),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      await event.deleteOne();
      await createAuditLog(
        req.user._id,
        "DELETE_EVENT",
        `Event #${event._id}`,
        "success",
        req.ip
      );

      res.json({ message: "Event removed" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// @route   POST /api/events/:id/register
// @desc    Register for an event
// @access  Private
router.post("/:id/register", protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if already registered
    if (event.registeredUsers.includes(req.user._id)) {
      return res
        .status(400)
        .json({ message: "Already registered for this event" });
    }

    // Check if event is full
    if (event.currentAttendees >= event.maxAttendees) {
      return res.status(400).json({ message: "Event is full" });
    }

    event.registeredUsers.push(req.user._id);
    event.currentAttendees += 1;
    await event.save();

    // Notify admins and staff about new event registration
    await notifyAdminsAndStaff(
      "New Event Registration",
      `${req.user.firstName} ${req.user.lastName} registered for the event: "${event.title}"`,
      "info"
    );

    res.json({ message: "Successfully registered for event" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
