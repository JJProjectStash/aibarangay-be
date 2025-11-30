import express from "express";
import { body, validationResult } from "express-validator";
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
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    body("firstName")
      .notEmpty()
      .withMessage("First name is required")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("First name must be between 2 and 50 characters")
      .matches(/^[a-zA-Z\s.-]+$/)
      .withMessage(
        "First name can only contain letters, spaces, dots, and dashes"
      ),
    body("lastName")
      .notEmpty()
      .withMessage("Last name is required")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Last name must be between 2 and 50 characters")
      .matches(/^[a-zA-Z\s.-]+$/)
      .withMessage(
        "Last name can only contain letters, spaces, dots, and dashes"
      ),
    body("phoneNumber")
      .optional()
      .matches(/^(09)\d{9}$/)
      .withMessage("Phone number must start with 09 and be 11 digits"),
    body("address")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Address must not exceed 200 characters"),
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors
          .array()
          .map((err) => ({ field: err.path, message: err.msg })),
      });
    }

    try {
      const { firstName, lastName, email, password, address, phoneNumber } =
        req.body;

      // Check if user exists
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res
          .status(400)
          .json({ message: "User already exists with this email" });
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
      console.error("Registration error:", error);
      res
        .status(500)
        .json({
          message: "Server error during registration. Please try again.",
        });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email")
      .normalizeEmail(),
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors
          .array()
          .map((err) => ({ field: err.path, message: err.msg })),
      });
    }

    try {
      const { email, password } = req.body;

      // Check for user
      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
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
        return res.status(401).json({ message: "Invalid email or password" });
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
      console.error("Login error:", error);
      res
        .status(500)
        .json({ message: "Server error during login. Please try again." });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

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
    console.error("Get user error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put(
  "/profile",
  protect,
  [
    body("firstName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("First name must be between 2 and 50 characters")
      .matches(/^[a-zA-Z\s.-]+$/)
      .withMessage(
        "First name can only contain letters, spaces, dots, and dashes"
      ),
    body("lastName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Last name must be between 2 and 50 characters")
      .matches(/^[a-zA-Z\s.-]+$/)
      .withMessage(
        "Last name can only contain letters, spaces, dots, and dashes"
      ),
    body("phoneNumber")
      .optional()
      .matches(/^(09)\d{9}$/)
      .withMessage("Phone number must start with 09 and be 11 digits"),
    body("address")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Address must not exceed 200 characters"),
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors
          .array()
          .map((err) => ({ field: err.path, message: err.msg })),
      });
    }

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
            return res
              .status(413)
              .json({
                message: "Avatar image too large. Maximum size is 4MB.",
              });
          }
        } catch (e) {
          // If parsing fails, continue — it's not necessarily base64
          console.warn("Avatar validation warning:", e);
        }
      }

      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update only provided fields
      if (req.body.firstName) user.firstName = req.body.firstName;
      if (req.body.lastName) user.lastName = req.body.lastName;
      if (req.body.address !== undefined) user.address = req.body.address;
      if (req.body.phoneNumber !== undefined)
        user.phoneNumber = req.body.phoneNumber;
      if (req.body.avatar) user.avatar = req.body.avatar;

      const updatedUser = await user.save();

      await createAuditLog(
        user._id,
        "USER_PROFILE_UPDATE",
        "Profile",
        "success",
        req.ip
      );

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
    } catch (error) {
      console.error("Profile update error:", error);
      res
        .status(500)
        .json({
          message: "Server error during profile update. Please try again.",
        });
    }
  }
);

export default router;
