import mongoose from "mongoose";

const complaintHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    by: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: String,
  },
  { _id: true }
);

const commentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      enum: ["resident", "staff", "admin"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const complaintSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved", "closed"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    feedback: String,
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    history: [complaintHistorySchema],
    comments: [commentSchema],
    attachments: [String],
  },
  {
    timestamps: true,
  }
);

// Add initial history entry on creation
complaintSchema.pre("save", function (next) {
  if (this.isNew) {
    this.history.push({
      action: "Complaint Filed",
      by: "System",
      timestamp: new Date(),
    });
  }
  next();
});

const Complaint = mongoose.model("Complaint", complaintSchema);

export default Complaint;
