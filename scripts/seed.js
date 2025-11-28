import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";
import Complaint from "../models/Complaint.js";
import ServiceRequest from "../models/ServiceRequest.js";
import Event from "../models/Event.js";
import Announcement from "../models/Announcement.js";
import Notification from "../models/Notification.js";
import NewsItem from "../models/NewsItem.js";
import Hotline from "../models/Hotline.js";
import Official from "../models/Official.js";
import FAQ from "../models/FAQ.js";
import SiteSettings from "../models/SiteSettings.js";
import AuditLog from "../models/AuditLog.js";

dotenv.config();

// Helper to get dynamic dates
const getRelativeDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const getFixedDateInCurrentMonth = (day) => {
  const date = new Date();
  date.setDate(day);
  return date;
};

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected for seeding...");

    // Clear existing data
    await User.deleteMany({});
    await Complaint.deleteMany({});
    await ServiceRequest.deleteMany({});
    await Event.deleteMany({});
    await Announcement.deleteMany({});
    await Notification.deleteMany({});
    await NewsItem.deleteMany({});
    await Hotline.deleteMany({});
    await Official.deleteMany({});
    await FAQ.deleteMany({});
    await SiteSettings.deleteMany({});
    await AuditLog.deleteMany({});

    console.log("Existing data cleared");

    // Create Users
    const users = await User.create([
      {
        firstName: "Juan",
        lastName: "Dela Cruz",
        email: "resident@ibarangay.com",
        password: "password123",
        role: "resident",
        avatar: "https://i.pravatar.cc/150?u=u1",
        address: "Block 5 Lot 2, Mabuhay St.",
        phoneNumber: "09171234567",
        isVerified: true,
      },
      {
        firstName: "Maria",
        lastName: "Santos",
        email: "staff@ibarangay.com",
        password: "password123",
        role: "staff",
        avatar: "https://i.pravatar.cc/150?u=u2",
        isVerified: true,
      },
      {
        firstName: "Admin",
        lastName: "User",
        email: "admin@ibarangay.com",
        password: "password123",
        role: "admin",
        avatar: "https://i.pravatar.cc/150?u=u3",
        isVerified: true,
      },
    ]);

    console.log("Users created");

    // Create Complaints
    await Complaint.create([
      {
        userId: users[0]._id,
        title: "Noisy Neighbors",
        description:
          "Karaoke until 3AM at Lot 5 Block 2. This has been happening every weekend.",
        category: "Noise Disturbance",
        status: "pending",
        priority: "medium",
        history: [
          {
            action: "Complaint Filed",
            by: "Juan Dela Cruz",
            timestamp: getRelativeDate(-2),
          },
        ],
        comments: [],
      },
      {
        userId: users[0]._id,
        title: "Uncollected Garbage",
        description: "Garbage truck did not pass by this week.",
        category: "Sanitation",
        status: "in-progress",
        priority: "high",
        assignedTo: users[1]._id,
        history: [
          {
            action: "Complaint Filed",
            by: "Juan Dela Cruz",
            timestamp: getRelativeDate(-5),
          },
          {
            action: "Status Updated to In-Progress",
            by: "Maria Santos",
            timestamp: getRelativeDate(-1),
            note: "Coordinating with sanitation department.",
          },
        ],
        comments: [
          {
            userId: users[1]._id,
            userName: "Maria Santos",
            userRole: "staff",
            message:
              "We have contacted the contractor. They should be there by tomorrow morning.",
            timestamp: getRelativeDate(-1),
          },
          {
            userId: users[0]._id,
            userName: "Juan Dela Cruz",
            userRole: "resident",
            message: "Thank you po. The smell is getting bad.",
            timestamp: getRelativeDate(-1),
          },
        ],
      },
      {
        userId: users[0]._id,
        title: "Street Light Broken",
        description: "Main street corner light is flickering.",
        category: "Maintenance",
        status: "resolved",
        priority: "low",
        assignedTo: users[1]._id,
        rating: 5,
        feedback: "Fast action, thanks!",
        history: [
          {
            action: "Complaint Filed",
            by: "Juan Dela Cruz",
            timestamp: getRelativeDate(-10),
          },
          {
            action: "Assigned to Staff",
            by: "Admin User",
            timestamp: getRelativeDate(-9),
          },
          {
            action: "Resolved",
            by: "Maria Santos",
            timestamp: getRelativeDate(-8),
            note: "Bulb replaced.",
          },
        ],
        comments: [],
      },
    ]);

    console.log("Complaints created");

    // Create Service Requests
    await ServiceRequest.create([
      {
        userId: users[0]._id,
        itemName: "Plastic Chairs (50pcs)",
        itemType: "Equipment",
        borrowDate: getRelativeDate(5),
        expectedReturnDate: getRelativeDate(6),
        status: "pending",
        purpose: "Birthday Party",
      },
      {
        userId: users[0]._id,
        itemName: "Basketball Court",
        itemType: "Facility",
        borrowDate: getRelativeDate(-2),
        expectedReturnDate: getRelativeDate(-2),
        status: "approved",
        purpose: "Youth League Practice",
      },
    ]);

    console.log("Service Requests created");

    // Create Events
    await Event.create([
      {
        title: "Barangay General Assembly",
        description:
          "Quarterly meeting to discuss budget and projects. All residents are encouraged to attend.",
        eventDate: getFixedDateInCurrentMonth(15),
        location: "Barangay Hall",
        organizerId: users[2]._id,
        maxAttendees: 200,
        currentAttendees: 45,
        category: "Meeting",
        status: "upcoming",
        imageUrl:
          "https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&q=80&w=300&h=200",
      },
      {
        title: "Free Medical Mission",
        description:
          "Free checkups and vitamins distribution for seniors and children.",
        eventDate: getFixedDateInCurrentMonth(20),
        location: "Covered Court",
        organizerId: users[1]._id,
        maxAttendees: 500,
        currentAttendees: 120,
        category: "Health",
        status: "upcoming",
        imageUrl:
          "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=300&h=200",
      },
      {
        title: "Youth Sports League",
        description:
          "Opening of the inter-barangay basketball and volleyball league.",
        eventDate: getFixedDateInCurrentMonth(25),
        location: "Sports Complex",
        organizerId: users[1]._id,
        maxAttendees: 300,
        currentAttendees: 50,
        category: "Sports",
        status: "upcoming",
        imageUrl: "/images/SportsEvent.jpg",
      },
    ]);

    console.log("Events created");

    // Create Announcements
    await Announcement.create([
      {
        title: "Scheduled Power Interruption",
        content:
          "Meralco scheduled maintenance on Nov 5, 8AM to 5PM affecting Block 1-5.",
        category: "maintenance",
        priority: "high",
        isPublished: true,
        isPinned: true,
        views: 1250,
        author: "Admin",
      },
      {
        title: "New Curfew Guidelines",
        content: "Curfew for minors is now strictly observed from 10PM to 4AM.",
        category: "policy",
        priority: "medium",
        isPublished: true,
        isPinned: false,
        views: 890,
        author: "Admin",
      },
    ]);

    console.log("Announcements created");

    // Create News Items
    await NewsItem.create([
      {
        title: "Barangay Wins Cleanest Community Award",
        summary:
          "Our barangay has been recognized as the cleanest in the district for the 3rd consecutive year.",
        content:
          "Our barangay has been recognized as the cleanest in the district for the 3rd consecutive year. This award is a testament to the hard work and dedication of our residents and street sweepers. We hope to maintain this status in the coming years.",
        imageUrl:
          "https://images.unsplash.com/photo-1558008258-3256797b43f3?auto=format&fit=crop&q=80&w=300&h=200",
        author: "Staff",
      },
      {
        title: "New Community Garden Project Launched",
        summary:
          "Residents gathered this weekend to plant vegetables in the new communal space.",
        content:
          "Residents gathered this weekend to plant vegetables in the new communal space located behind the multi-purpose hall. This project aims to promote urban farming and food sustainability.",
        imageUrl:
          "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&q=80&w=300&h=200",
        author: "Staff",
      },
    ]);

    console.log("News Items created");

    // Create Notifications
    await Notification.create([
      {
        userId: users[0]._id,
        title: "Service Approved",
        message: "Your request for Basketball Court has been approved.",
        type: "success",
        isRead: false,
      },
      {
        userId: users[0]._id,
        title: "Announcement",
        message: "New scheduled power interruption posted.",
        type: "warning",
        isRead: true,
      },
    ]);

    console.log("Notifications created");

    // Create Hotlines
    await Hotline.create([
      {
        name: "Barangay Emergency",
        number: "(02) 8123-4567",
        category: "emergency",
      },
      { name: "Police Station", number: "117", category: "security" },
      { name: "Fire Station", number: "911", category: "emergency" },
      { name: "Health Center", number: "(02) 8123-5555", category: "health" },
      {
        name: "Barangay Captain",
        number: "0917-000-0000",
        category: "official",
      },
      { name: "Meralco", number: "16211", category: "utility" },
    ]);

    console.log("Hotlines created");

    // Create Officials
    await Official.create([
      {
        name: "Hon. Ricardo Dalisay",
        position: "Barangay Captain",
        imageUrl: "https://i.pravatar.cc/150?u=off1",
      },
      {
        name: "Kgd. Flora Borja",
        position: "Kagawad - Health",
        imageUrl: "https://i.pravatar.cc/150?u=off2",
      },
      {
        name: "Kgd. Delfin Borja",
        position: "Kagawad - Security",
        imageUrl: "https://i.pravatar.cc/150?u=off3",
      },
      {
        name: "Sec. Teddy Arellano",
        position: "Barangay Secretary",
        imageUrl: "https://i.pravatar.cc/150?u=off4",
      },
    ]);

    console.log("Officials created");

    // Create FAQs
    await FAQ.create([
      {
        question: "How do I file a complaint?",
        answer:
          "Navigate to the Complaints page, click File Complaint, and fill out the form.",
        category: "Services",
      },
      {
        question: "What are the requirements for residency ID?",
        answer:
          "You need to present a valid government ID and proof of billing.",
        category: "Documents",
      },
    ]);

    console.log("FAQs created");

    // Create Site Settings
    await SiteSettings.create({
      barangayName: "Barangay San Isidro",
      logoUrl: "https://cdn-icons-png.flaticon.com/512/921/921356.png",
      contactEmail: "help@ibarangay.com",
      contactPhone: "(02) 8123-4567",
      address: "123 Rizal St, Barangay San Isidro, Quezon City",
      facebookUrl: "https://facebook.com",
      twitterUrl: "https://twitter.com",
    });

    console.log("Site Settings created");

    // Create Audit Logs
    await AuditLog.create([
      {
        userId: users[2]._id,
        action: "USER_LOGIN",
        resource: "Auth System",
        status: "success",
        ipAddress: "192.168.1.1",
      },
      {
        userId: users[1]._id,
        action: "UPDATE_COMPLAINT_STATUS",
        resource: "Complaint #c1",
        status: "success",
        ipAddress: "192.168.1.25",
      },
      {
        userId: users[2]._id,
        action: "DELETE_USER",
        resource: "User #u5",
        status: "success",
        ipAddress: "192.168.1.1",
      },
    ]);

    console.log("Audit Logs created");

    console.log("\n✅ Database seeded successfully!");
    console.log("\nTest Accounts:");
    console.log("Resident: resident@ibarangay.com / password123");
    console.log("Staff: staff@ibarangay.com / password123");
    console.log("Admin: admin@ibarangay.com / password123");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
