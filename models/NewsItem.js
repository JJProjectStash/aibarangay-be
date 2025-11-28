import mongoose from "mongoose";

const newsItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    summary: {
      type: String,
      required: [true, "Summary is required"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    imageUrl: {
      type: String,
      required: true,
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

const NewsItem = mongoose.model("NewsItem", newsItemSchema);

export default NewsItem;
