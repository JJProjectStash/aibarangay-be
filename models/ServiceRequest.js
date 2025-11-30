import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestType: {
      type: String,
      enum: ["Equipment", "Facility"],
      required: [true, "Request type is required"],
      default: "Equipment",
    },
    itemName: {
      type: String,
      required: [true, "Item/Facility name is required"],
      trim: true,
    },
    itemType: {
      type: String,
      required: [true, "Item/Facility type is required"],
    },
    borrowDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    expectedReturnDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    // Facility-specific fields
    timeSlot: {
      type: String,
      trim: true,
    },
    numberOfPeople: {
      type: Number,
      min: 1,
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
