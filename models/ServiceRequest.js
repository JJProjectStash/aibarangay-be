import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    itemName: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    itemType: {
      type: String,
      required: [true, "Item type is required"],
    },
    borrowDate: {
      type: Date,
      required: [true, "Borrow date is required"],
    },
    expectedReturnDate: {
      type: Date,
      required: [true, "Expected return date is required"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "borrowed", "returned", "rejected"],
      default: "pending",
    },
    purpose: {
      type: String,
      required: [true, "Purpose is required"],
    },
    notes: String,
    rejectionReason: String,
    approvalNote: String,
  },
  {
    timestamps: true,
  }
);

const ServiceRequest = mongoose.model("ServiceRequest", serviceRequestSchema);

export default ServiceRequest;
