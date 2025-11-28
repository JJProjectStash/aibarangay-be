import mongoose from "mongoose";

const siteSettingsSchema = new mongoose.Schema(
  {
    barangayName: {
      type: String,
      required: [true, "Barangay name is required"],
      trim: true,
    },
    logoUrl: {
      type: String,
      required: true,
    },
    contactEmail: {
      type: String,
      required: [true, "Contact email is required"],
      trim: true,
    },
    contactPhone: {
      type: String,
      required: [true, "Contact phone is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
    },
    facebookUrl: String,
    twitterUrl: String,
  },
  {
    timestamps: true,
  }
);

const SiteSettings = mongoose.model("SiteSettings", siteSettingsSchema);

export default SiteSettings;
