import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import Complaint from "../models/Complaint.js";
import ServiceRequest from "../models/ServiceRequest.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import PDFDocument from "pdfkit";

const router = express.Router();

// @route   GET /api/stats
// @desc    Get dashboard statistics (role-based)
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    // Admin/Staff View: System-wide stats
    if (req.user.role === "admin" || req.user.role === "staff") {
      const totalResidents = await User.countDocuments({ role: "resident" });
      const pendingComplaints = await Complaint.countDocuments({
        status: "pending",
      });
      const activeServices = await ServiceRequest.countDocuments({
        status: { $in: ["approved", "borrowed"] },
      });
      const upcomingEvents = await Event.countDocuments({ status: "upcoming" });
      const resolvedComplaints = await Complaint.countDocuments({
        status: "resolved",
      });

      return res.json({
        totalResidents,
        pendingComplaints,
        activeServices,
        upcomingEvents,
        resolvedComplaints,
      });
    }

    // Resident View: Personal stats
    const myPendingComplaints = await Complaint.countDocuments({
      userId: req.user._id,
      status: "pending",
    });
    const myActiveServices = await ServiceRequest.countDocuments({
      userId: req.user._id,
      status: { $in: ["approved", "borrowed"] },
    });
    const upcomingEvents = await Event.countDocuments({ status: "upcoming" });
    const myTotalComplaints = await Complaint.countDocuments({
      userId: req.user._id,
    });

    res.json({
      myPendingComplaints,
      myActiveServices,
      upcomingEvents,
      myTotalComplaints,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/stats/report
// @desc    Generate PDF report
// @access  Private (Admin/Staff)
router.get(
  "/report",
  protect,
  authorize("admin", "staff"),
  async (req, res) => {
    try {
      // Fetch all statistics
      const totalResidents = await User.countDocuments({ role: "resident" });
      const totalStaff = await User.countDocuments({ role: "staff" });
      const totalAdmins = await User.countDocuments({ role: "admin" });

      const pendingComplaints = await Complaint.countDocuments({
        status: "pending",
      });
      const inProgressComplaints = await Complaint.countDocuments({
        status: "in-progress",
      });
      const resolvedComplaints = await Complaint.countDocuments({
        status: "resolved",
      });
      const closedComplaints = await Complaint.countDocuments({
        status: "closed",
      });

      const pendingServices = await ServiceRequest.countDocuments({
        status: "pending",
      });
      const approvedServices = await ServiceRequest.countDocuments({
        status: "approved",
      });
      const borrowedServices = await ServiceRequest.countDocuments({
        status: "borrowed",
      });
      const returnedServices = await ServiceRequest.countDocuments({
        status: "returned",
      });
      const rejectedServices = await ServiceRequest.countDocuments({
        status: "rejected",
      });

      const upcomingEvents = await Event.countDocuments({ status: "upcoming" });
      const ongoingEvents = await Event.countDocuments({ status: "ongoing" });
      const completedEvents = await Event.countDocuments({
        status: "completed",
      });
      const cancelledEvents = await Event.countDocuments({
        status: "cancelled",
      });

      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=barangay-report-${
          new Date().toISOString().split("T")[0]
        }.pdf`
      );

      // Pipe PDF to response
      doc.pipe(res);

      // Add header
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .text("Barangay Management Report", { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .font("Helvetica")
        .text(`Generated on: ${new Date().toLocaleString()}`, {
          align: "center",
        });
      doc.moveDown(2);

      // User Statistics
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("User Statistics", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).font("Helvetica");
      doc.text(`Total Residents: ${totalResidents}`);
      doc.text(`Total Staff: ${totalStaff}`);
      doc.text(`Total Admins: ${totalAdmins}`);
      doc.text(`Total Users: ${totalResidents + totalStaff + totalAdmins}`);
      doc.moveDown(2);

      // Complaints Statistics
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Complaints Overview", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).font("Helvetica");
      doc.text(`Pending: ${pendingComplaints}`);
      doc.text(`In Progress: ${inProgressComplaints}`);
      doc.text(`Resolved: ${resolvedComplaints}`);
      doc.text(`Closed: ${closedComplaints}`);
      doc.text(
        `Total Complaints: ${
          pendingComplaints +
          inProgressComplaints +
          resolvedComplaints +
          closedComplaints
        }`
      );
      doc.moveDown(2);

      // Service Requests Statistics
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Service Requests Overview", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).font("Helvetica");
      doc.text(`Pending: ${pendingServices}`);
      doc.text(`Approved: ${approvedServices}`);
      doc.text(`Borrowed: ${borrowedServices}`);
      doc.text(`Returned: ${returnedServices}`);
      doc.text(`Rejected: ${rejectedServices}`);
      doc.text(
        `Total Service Requests: ${
          pendingServices +
          approvedServices +
          borrowedServices +
          returnedServices +
          rejectedServices
        }`
      );
      doc.moveDown(2);

      // Events Statistics
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Events Overview", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).font("Helvetica");
      doc.text(`Upcoming: ${upcomingEvents}`);
      doc.text(`Ongoing: ${ongoingEvents}`);
      doc.text(`Completed: ${completedEvents}`);
      doc.text(`Cancelled: ${cancelledEvents}`);
      doc.text(
        `Total Events: ${
          upcomingEvents + ongoingEvents + completedEvents + cancelledEvents
        }`
      );
      doc.moveDown(2);

      // Add footer
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(
          "This report is confidential and intended for authorized personnel only.",
          50,
          doc.page.height - 50,
          { align: "center" }
        );

      // Finalize PDF
      doc.end();
    } catch (error) {
      console.error("PDF generation error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;
