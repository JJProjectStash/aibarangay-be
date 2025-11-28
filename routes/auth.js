import express from "express";
import { body } from "express-validator";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import createAuditLog from "../utils/createAuditLog.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("firstName").notEmpty().withMessage("First name is required"),
    body("lastName").notEmpty().withMessage("Last name is required"),
  ],
  async (req, res) => {
    try {
      const { firstName, lastName, email, password, address, phoneNumber } =
        req.body;

      // Check if user exists
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Create user
      const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        address,
        phoneNumber,
        role: "resident",
      });

      if (user) {
        await createAuditLog(
          user._id,
          "USER_REGISTER",
          "Auth System",
          "success",
          req.ip
        );

        res.status(201).json({
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          address: user.address,
          phoneNumber: user.phoneNumber,
          isVerified: user.isVerified,
          token: generateToken(user._id),
        });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  "/login",
  [body("email").isEmail().withMessage("Please provide a valid email")],
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Check for user
      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check password
      const isMatch = password ? await user.matchPassword(password) : true; // Allow passwordless login for demo

      if (!isMatch) {
        await createAuditLog(
          user._id,
          "USER_LOGIN",
          "Auth System",
          "failure",
          req.ip
        );
        return res.status(401).json({ message: "Invalid credentials" });
      }

      await createAuditLog(
        user._id,
        "USER_LOGIN",
        "Auth System",
        "success",
        req.ip
      );

      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        address: user.address,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified,
        token: generateToken(user._id),
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      address: user.address,
      phoneNumber: user.phoneNumber,
      isVerified: user.isVerified,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put("/profile", protect, async (req, res) => {
  try {
    // If avatar is sent as base64, check size and prevent too large payloads
    if (req.body.avatar) {
      try {
        const base64 = req.body.avatar.includes(",")
          ? req.body.avatar.split(",")[1]
          : req.body.avatar;
        // Calculate size in bytes (approx)
        const sizeInBytes = Math.ceil((base64.length * 3) / 4);
        const MAX_AVATAR_BYTES = 4 * 1024 * 1024; // 4MB
        if (sizeInBytes > MAX_AVATAR_BYTES) {
          return res.status(413).json({ message: "Avatar image too large" });
        }
      } catch (e) {
        // If parsing fails, continue — it's not necessarily base64
      }
    }
    const user = await User.findById(req.user._id);

    if (user) {
      user.firstName = req.body.firstName || user.firstName;
      user.lastName = req.body.lastName || user.lastName;
      user.address = req.body.address || user.address;
      user.phoneNumber = req.body.phoneNumber || user.phoneNumber;
      user.avatar = req.body.avatar || user.avatar;

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        address: updatedUser.address,
        phoneNumber: updatedUser.phoneNumber,
        isVerified: updatedUser.isVerified,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
