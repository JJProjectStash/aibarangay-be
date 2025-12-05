import mongoose from "mongoose";

/**
 * Connect to MongoDB with retry logic
 * @param {number} retries - Number of connection retries
 * @param {number} delay - Delay between retries in milliseconds
 */
const connectDB = async (
  retries = parseInt(process.env.DB_CONNECTION_RETRIES) || 5,
  delay = 5000
) => {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
      });

      console.log(`MongoDB Connected: ${conn.connection.host}`);

      // Handle connection events
      mongoose.connection.on("error", (err) => {
        console.error("MongoDB connection error:", err);
      });

      mongoose.connection.on("disconnected", () => {
        console.warn("MongoDB disconnected. Attempting to reconnect...");
      });

      mongoose.connection.on("reconnected", () => {
        console.log("MongoDB reconnected");
      });

      return conn;
    } catch (error) {
      console.error(
        `MongoDB connection attempt ${i + 1}/${retries} failed:`,
        error.message
      );
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  console.error("Failed to connect to MongoDB after all retries");
  process.exit(1);
};

export default connectDB;
