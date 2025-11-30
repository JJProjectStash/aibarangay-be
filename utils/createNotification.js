import Notification from "../models/Notification.js";
import User from "../models/User.js";

/**
 * Create a notification for a specific user
 * @param {string} userId - The user ID to notify
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (info, warning, success, error)
 */
export const createNotification = async (
  userId,
  title,
  message,
  type = "info"
) => {
  try {
    await Notification.create({
      userId,
      title,
      message,
      type,
      isRead: false,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

/**
 * Create notifications for all users with a specific role
 * @param {string} role - User role (resident, staff, admin)
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 */
export const createNotificationForRole = async (
  role,
  title,
  message,
  type = "info"
) => {
  try {
    const users = await User.find({ role });

    const notifications = users.map((user) => ({
      userId: user._id,
      title,
      message,
      type,
      isRead: false,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (error) {
    console.error("Error creating notifications for role:", error);
  }
};

/**
 * Create notifications for all admins and staff
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 */
export const notifyAdminsAndStaff = async (title, message, type = "info") => {
  try {
    const users = await User.find({ role: { $in: ["admin", "staff"] } });

    const notifications = users.map((user) => ({
      userId: user._id,
      title,
      message,
      type,
      isRead: false,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (error) {
    console.error("Error notifying admins and staff:", error);
  }
};

export default createNotification;
