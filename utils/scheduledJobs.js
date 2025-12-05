import cron from "node-cron";
import ServiceRequest from "../models/ServiceRequest.js";
import Notification from "../models/Notification.js";

/**
 * Check for overdue and due-soon service requests
 * Runs daily at 8 AM
 */
const checkOverdueServices = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find overdue items (borrowed/approved and past expectedReturnDate)
    const overdueServices = await ServiceRequest.find({
      status: { $in: ["borrowed", "approved"] },
      expectedReturnDate: { $lt: today },
    }).populate("userId", "firstName lastName");

    console.log(`[CRON] Found ${overdueServices.length} overdue services`);

    for (const service of overdueServices) {
      // Check if we already notified today to avoid spam
      const existingNotification = await Notification.findOne({
        userId: service.userId._id,
        title: "⚠️ Overdue Return Notice",
        createdAt: { $gte: today },
      });

      if (!existingNotification) {
        await Notification.create({
          userId: service.userId._id,
          title: "⚠️ Overdue Return Notice",
          message: `Your ${service.requestType.toLowerCase()} request for "${service.itemName}" is overdue. Please return it as soon as possible.`,
          type: "warning",
        });
        console.log(
          `[CRON] Sent overdue notification for service ${service._id}`
        );
      }
    }

    // Find items due within 2 days
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const dueSoonServices = await ServiceRequest.find({
      status: { $in: ["borrowed", "approved"] },
      expectedReturnDate: { $gte: today, $lte: twoDaysFromNow },
    }).populate("userId", "firstName lastName");

    console.log(`[CRON] Found ${dueSoonServices.length} due-soon services`);

    for (const service of dueSoonServices) {
      const daysUntilDue = Math.ceil(
        (new Date(service.expectedReturnDate) - today) / (1000 * 60 * 60 * 24)
      );

      // Check if we already notified today
      const existingNotification = await Notification.findOne({
        userId: service.userId._id,
        title: "📅 Return Reminder",
        createdAt: { $gte: today },
      });

      if (!existingNotification) {
        await Notification.create({
          userId: service.userId._id,
          title: "📅 Return Reminder",
          message: `Your ${service.requestType.toLowerCase()} request for "${
            service.itemName
          }" is due ${
            daysUntilDue === 0 ? "today" : `in ${daysUntilDue} day(s)`
          }.`,
          type: "info",
        });
        console.log(
          `[CRON] Sent due-soon notification for service ${service._id}`
        );
      }
    }
  } catch (error) {
    console.error("[CRON] Error checking overdue services:", error);
  }
};

/**
 * Initialize all scheduled jobs
 */
export const initScheduledJobs = () => {
  // Run daily at 8 AM
  cron.schedule("0 8 * * *", () => {
    console.log("[CRON] Running overdue service check...");
    checkOverdueServices();
  });

  console.log("[CRON] Scheduled jobs initialized");
};

// Export for manual triggering (useful for testing)
export { checkOverdueServices };
