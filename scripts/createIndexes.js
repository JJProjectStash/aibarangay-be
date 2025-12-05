import mongoose from "mongoose";
import dotenv from "dotenv";

// Load env vars
dotenv.config();

// Import models to ensure indexes are created
import "../models/Complaint.js";
import "../models/ServiceRequest.js";
import "../models/Event.js";
import "../models/Notification.js";
import "../models/AuditLog.js";
import "../models/User.js";
import "../models/Announcement.js";
import "../models/NewsItem.js";

const createIndexes = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("Connected to MongoDB");

    console.log("\nCreating indexes...");

    // Get all model names
    const modelNames = mongoose.modelNames();

    for (const modelName of modelNames) {
      const model = mongoose.model(modelName);
      try {
        await model.syncIndexes();
        console.log(`✓ Indexes synced for ${modelName}`);

        // List all indexes for this collection
        const indexes = await model.collection.indexes();
        console.log(
          `  Indexes: ${indexes.map((idx) => idx.name).join(", ")}\n`
        );
      } catch (error) {
        console.error(
          `✗ Error syncing indexes for ${modelName}:`,
          error.message
        );
      }
    }

    console.log("Index creation complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error creating indexes:", error);
    process.exit(1);
  }
};

createIndexes();
