import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";
import Complaint from "../models/Complaint.js";
import ServiceRequest from "../models/ServiceRequest.js";
import Event from "../models/Event.js";
import Announcement from "../models/Announcement.js";
import Notification from "../models/Notification.js";
import NewsItem from "../models/NewsItem.js";
import Hotline from "../models/Hotline.js";
import Official from "../models/Official.js";
import FAQ from "../models/FAQ.js";
import SiteSettings from "../models/SiteSettings.js";
import AuditLog from "../models/AuditLog.js";
import connectDB from "../config/db.js";

dotenv.config();

const wipeDatabase = async () => {
  try {
    await connectDB();
    console.log("Connected to DB. Starting teardown of data (not structure).");

    const models = [
      { name: "User", model: User },
      { name: "Complaint", model: Complaint },
      { name: "ServiceRequest", model: ServiceRequest },
      { name: "Event", model: Event },
      { name: "Announcement", model: Announcement },
      { name: "Notification", model: Notification },
      { name: "NewsItem", model: NewsItem },
      { name: "Hotline", model: Hotline },
      { name: "Official", model: Official },
      { name: "FAQ", model: FAQ },
      { name: "SiteSettings", model: SiteSettings },
      { name: "AuditLog", model: AuditLog },
    ];

    // Delete document data but keep collections and indexes (do not drop DB)
    for (const entry of models) {
      try {
        await entry.model.deleteMany({});
        console.log(`Cleared documents for ${entry.name}`);
      } catch (err) {
        console.error(`Failed to clear ${entry.name}:`, err.message);
      }
    }

    console.log("✅ Wipe complete. All data cleared without dropping structure.");
    process.exit(0);
  } catch (error) {
    console.error("Error wiping database:", error);
    process.exit(1);
  }
};

wipeDatabase();
