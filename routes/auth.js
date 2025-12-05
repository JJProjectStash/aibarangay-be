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
          { email: user.email },
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
          idDocumentUrl: user.idDocumentUrl,
          token: generateToken(user._id),
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
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
    body("password").notEmpty().withMessage("Password is required"),
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

      // Check if user is locked out
      if (user.isLockedOut()) {
        const remainingSeconds = user.getRemainingLockoutTime();
        const remainingMinutes = Math.ceil(remainingSeconds / 60);

        await createAuditLog(
          user._id,
          "USER_LOGIN",
          "Auth System",
          { email: user.email, reason: "Account locked out" },
          "failure",
          req.ip
        );

        return res.status(423).json({
          message: `Account temporarily locked. Try again in ${remainingMinutes} minute${
            remainingMinutes !== 1 ? "s" : ""
          }.`,
          lockoutUntil: user.lockoutUntil,
          isLockedOut: true,
          remainingSeconds,
        });
      }

      // Check password
      const isMatch = await user.matchPassword(password);

      if (!isMatch) {
        await user.incrementLoginAttempts();

        const maxAttempts = parseInt(process.env.LOGIN_MAX_ATTEMPTS) || 5;
        const remainingAttempts = Math.max(0, maxAttempts - user.loginAttempts);

        await createAuditLog(
          user._id,
          "USER_LOGIN",
          "Auth System",
          {
            email: user.email,
            reason: "Invalid password",
            attemptsRemaining: remainingAttempts,
          },
          "failure",
          req.ip
        );

        // Check if this attempt caused a lockout
        if (user.isLockedOut()) {
          const remainingSeconds = user.getRemainingLockoutTime();
          const remainingMinutes = Math.ceil(remainingSeconds / 60);

          return res.status(423).json({
            message: `Too many failed attempts. Account locked for ${remainingMinutes} minute${
              remainingMinutes !== 1 ? "s" : ""
            }.`,
            lockoutUntil: user.lockoutUntil,
            isLockedOut: true,
            remainingSeconds,
            remainingAttempts: 0,
          });
        }

        return res.status(401).json({
          message: "Invalid email or password",
          remainingAttempts,
        });
      }

      // Reset login attempts on successful login
      await user.resetLoginAttempts();

      await createAuditLog(
        user._id,
        "USER_LOGIN",
        "Auth System",
        { email: user.email },
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
        idDocumentUrl: user.idDocumentUrl,
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
      idDocumentUrl: user.idDocumentUrl,
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
      .custom((value) => {
        // Allow empty string or null
        if (!value || value === "") return true;
        // Otherwise validate format
        return /^(09)\d{9}$/.test(value);
      })
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
      console.error("Validation errors:", errors.array());
      return res.status(400).json({
        message: "Validation failed",
        errors: errors
          .array()
          .map((err) => ({ field: err.path, message: err.msg })),
      });
    }

    try {
      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update only provided fields
      if (req.body.firstName !== undefined) user.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) user.lastName = req.body.lastName;
      if (req.body.address !== undefined) user.address = req.body.address;
      if (req.body.phoneNumber !== undefined)
        user.phoneNumber = req.body.phoneNumber;

      // Handle avatar upload with size validation
      if (req.body.avatar !== undefined) {
        if (req.body.avatar) {
          try {
            const base64 = req.body.avatar.includes(",")
              ? req.body.avatar.split(",")[1]
              : req.body.avatar;
            const sizeInBytes = Math.ceil((base64.length * 3) / 4);
            const MAX_AVATAR_BYTES = 4 * 1024 * 1024; // 4MB
            if (sizeInBytes > MAX_AVATAR_BYTES) {
              return res.status(413).json({
                message: "Avatar image too large. Maximum size is 4MB.",
              });
            }
          } catch (e) {
            console.warn("Avatar validation warning:", e);
          }
        }
        user.avatar = req.body.avatar;
      }

      // Handle ID document upload with size validation
      if (req.body.idDocumentUrl !== undefined) {
        if (req.body.idDocumentUrl) {
          try {
            const base64 = req.body.idDocumentUrl.includes(",")
              ? req.body.idDocumentUrl.split(",")[1]
              : req.body.idDocumentUrl;
            const sizeInBytes = Math.ceil((base64.length * 3) / 4);
            const MAX_ID_BYTES = 5 * 1024 * 1024; // 5MB
            if (sizeInBytes > MAX_ID_BYTES) {
              return res.status(413).json({
                message: "ID document too large. Maximum size is 5MB.",
              });
            }
          } catch (e) {
            console.warn("ID document validation warning:", e);
          }

          // Log the ID upload action
          await createAuditLog(
            user._id,
            "USER_ID_UPLOAD",
            "Profile",
            { hasDocument: true },
            "success",
            req.ip
          );
        }
        user.idDocumentUrl = req.body.idDocumentUrl;
      }

      const updatedUser = await user.save();

      await createAuditLog(
        user._id,
        "USER_PROFILE_UPDATE",
        "Profile",
        {
          updatedFields: Object.keys(req.body).filter(
            (k) => req.body[k] !== undefined
          ),
        },
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
        idDocumentUrl: updatedUser.idDocumentUrl,
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({
        message: "Server error during profile update. Please try again.",
      });
    }
  }
);

export default router;
