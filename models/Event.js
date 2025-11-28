import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    eventDate: {
      type: Date,
      required: [true, "Event date is required"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
    },
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    maxAttendees: {
      type: Number,
      required: true,
      min: 1,
    },
    currentAttendees: {
      type: Number,
      default: 0,
      min: 0,
    },
    registeredUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    category: {
      type: String,
      required: true,
    },
    imageUrl: String,
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },
  },
  {
    timestamps: true,
  }
);

const Event = mongoose.model("Event", eventSchema);

export default Event;
