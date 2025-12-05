import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import errorHandler from "./middleware/errorHandler.js";
import timeout from "./middleware/timeout.js";

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Route imports
import authRoutes from "./routes/auth.js";
import complaintsRoutes from "./routes/complaints.js";
import servicesRoutes from "./routes/services.js";
import eventsRoutes from "./routes/events.js";
import announcementsRoutes from "./routes/announcements.js";
import notificationsRoutes from "./routes/notifications.js";
import statsRoutes from "./routes/stats.js";
import newsRoutes from "./routes/news.js";
import publicRoutes from "./routes/public.js";
import contentRoutes from "./routes/content.js";
import adminRoutes from "./routes/admin.js";

const app = express();

// Security headers
app.use(helmet());

// Response compression
app.use(compression());

// Request timeout middleware
app.use(timeout(parseInt(process.env.REQUEST_TIMEOUT_SECONDS) || 30));

// Global rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per windowMs
  message: { message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5, // 5 attempts per window
  message: { message: "Too many login attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Increase request body limits to allow client avatars and larger payloads (e.g., base64 images)
// Keep a reasonable limit to prevent abuse. Adjust as needed.
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintsRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/announcements", announcementsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/public", publicRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    message: "iBarangay API is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  server.close(() => {
    console.log("HTTP server closed");

    mongoose.connection.close(false).then(() => {
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error("Forcing shutdown...");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
