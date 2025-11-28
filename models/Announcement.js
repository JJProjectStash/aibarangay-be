import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    category: {
      type: String,
      enum: ["general", "emergency", "event", "maintenance", "policy"],
      default: "general",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    author: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Announcement = mongoose.model("Announcement", announcementSchema);

export default Announcement;
