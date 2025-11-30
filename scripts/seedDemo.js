import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";
import connectDB from "../config/db.js";
import generateToken from "../utils/generateToken.js";

dotenv.config();

const DEFAULT_PASSWORD = process.env.DEMO_PASSWORD || "password123";

const demoUsers = [
  {
    firstName: "Juan",
    lastName: "Dela Cruz",
    email: process.env.DEMO_RESIDENT_EMAIL || "resident@ibarangay.com",
    password: DEFAULT_PASSWORD,
    role: "resident",
    avatar: "https://i.pravatar.cc/150?u=u1",
    address: "Block 5 Lot 2, Mabuhay St.",
    phoneNumber: "09171234567",
    isVerified: true,
  },
  {
    firstName: "Maria",
    lastName: "Santos",
    email: process.env.DEMO_STAFF_EMAIL || "staff@ibarangay.com",
    password: DEFAULT_PASSWORD,
    role: "staff",
    avatar: "https://i.pravatar.cc/150?u=u2",
    isVerified: true,
  },
  {
    firstName: "Admin",
    lastName: "User",
    email: process.env.DEMO_ADMIN_EMAIL || "admin@ibarangay.com",
    password: DEFAULT_PASSWORD,
    role: "admin",
    avatar: "https://i.pravatar.cc/150?u=u3",
    isVerified: true,
  },
];

const seedDemo = async () => {
  try {
    await connectDB();
    console.log("Connected to DB. Seeding demo users only (resident, staff, admin)...");

    // Remove any existing demo accounts with the same demo emails
    const demoEmails = demoUsers.map((u) => u.email);
    await User.deleteMany({ email: { $in: demoEmails } });

    const created = await User.create(demoUsers);

    console.log("✅ Demo users created: ");
    for (const u of created) {
      const token = generateToken(u._id);
      console.log(`- ${u.role.toUpperCase()}: ${u.email} / ${DEFAULT_PASSWORD}`);
      console.log(`  Token (for testing): ${token}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error seeding demo account:", error);
    process.exit(1);
  }
};

seedDemo();
