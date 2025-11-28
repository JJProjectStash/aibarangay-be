import mongoose from "mongoose";

const officialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    position: {
      type: String,
      required: [true, "Position is required"],
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    contact: String,
  },
  {
    timestamps: true,
  }
);

const Official = mongoose.model("Official", officialSchema);

export default Official;
