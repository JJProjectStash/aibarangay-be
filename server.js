import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import connectDB from "./config/db.js";
import errorHandler from "./middleware/errorHandler.js";

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

// Middleware
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
  res.json({ status: "OK", message: "iBarangay API is running" });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
