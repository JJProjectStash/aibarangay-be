import mongoose from "mongoose";

const hotlineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    number: {
      type: String,
      required: [true, "Number is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: ["emergency", "health", "security", "utility", "official"],
      required: true,
    },
    icon: String,
  },
  {
    timestamps: true,
  }
);

const Hotline = mongoose.model("Hotline", hotlineSchema);

export default Hotline;
