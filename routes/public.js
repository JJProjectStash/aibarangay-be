import express from "express";
import Event from "../models/Event.js";
import Announcement from "../models/Announcement.js";
import NewsItem from "../models/NewsItem.js";
import Official from "../models/Official.js";
import SiteSettings from "../models/SiteSettings.js";
import cacheMiddleware from "../middleware/cache.js";

const router = express.Router();

// @route   GET /api/public/events
// @desc    Get all events (public)
// @access  Public
router.get("/events", cacheMiddleware(60), async (req, res) => {
  try {
    const events = await Event.find()
      .populate("organizerId", "firstName lastName")
      .sort({ eventDate: 1 });

    // No auth => can't determine registration; default isRegistered to false
    const eventsWithRegistration = events.map((event) => {
      const eventObj = event.toObject();
      eventObj.isRegistered = false;
      return eventObj;
    });

    res.json(eventsWithRegistration);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/public/announcements
// @desc    Get all announcements (public)
// @access  Public
router.get("/announcements", cacheMiddleware(60), async (req, res) => {
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

// @route   GET /api/public/news
// @desc    Get all news items (public)
// @access  Public
router.get("/news", cacheMiddleware(60), async (req, res) => {
  try {
    const news = await NewsItem.find().sort({ createdAt: -1 });
    res.json(news);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/public/officials
// @desc    Get all officials (public)
// @access  Public
router.get("/officials", cacheMiddleware(300), async (req, res) => {
  try {
    const officials = await Official.find().sort({ createdAt: 1 });
    res.json(officials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/public/settings
// @desc    Get site settings (public)
// @access  Public
router.get("/settings", cacheMiddleware(300), async (req, res) => {
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

export default router;
