import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Lockout configuration
const LOCKOUT_CONFIG = {
  maxAttempts: parseInt(process.env.LOGIN_MAX_ATTEMPTS) || 5,
  lockoutDuration:
    parseInt(process.env.LOGIN_LOCKOUT_DURATION_MS) || 5 * 60 * 1000, // 5 minutes
};

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["resident", "staff", "admin"],
      default: "resident",
    },
    avatar: {
      type: String,
      default: function () {
        return `https://i.pravatar.cc/150?u=${this._id}`;
      },
    },
    address: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    idDocumentUrl: {
      type: String,
    },
    // Login attempt tracking fields
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockoutUntil: {
      type: Date,
      default: null,
    },
    lastFailedLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to check if user is locked out
userSchema.methods.isLockedOut = function () {
  return this.lockoutUntil && this.lockoutUntil > Date.now();
};

// Method to get remaining lockout time in seconds
userSchema.methods.getRemainingLockoutTime = function () {
  if (!this.isLockedOut()) return 0;
  return Math.ceil((this.lockoutUntil - Date.now()) / 1000);
};

// Method to increment login attempts
userSchema.methods.incrementLoginAttempts = async function () {
  this.loginAttempts += 1;
  this.lastFailedLogin = new Date();

  if (this.loginAttempts >= LOCKOUT_CONFIG.maxAttempts) {
    this.lockoutUntil = new Date(Date.now() + LOCKOUT_CONFIG.lockoutDuration);
  }

  await this.save();
};

// Method to reset login attempts on successful login
userSchema.methods.resetLoginAttempts = async function () {
  if (this.loginAttempts > 0 || this.lockoutUntil) {
    this.loginAttempts = 0;
    this.lockoutUntil = null;
    this.lastFailedLogin = null;
    await this.save();
  }
};

// Add index for lockout queries (email index already created by unique: true)
userSchema.index({ lockoutUntil: 1 });

const User = mongoose.model("User", userSchema);

export default User;
