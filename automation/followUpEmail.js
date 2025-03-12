import cron from "node-cron";
import { sendEmail } from "../utils/sendEmail.js";
import { User } from "../models/userSchema.js";

export const scheduleFollowUpEmail = () => {
  cron.schedule("0 9 * * *", async () => {
    console.log("Running Follow-Up Email Automation");

    const users = await User.find(); 

    for (const user of users) {
      try {
        const subject = "Your CV is Under Review!";
        const message = `Hi ${user.name},\n\nYour CV is currently under review. We appreciate your patience and will update you soon.\n\nBest regards,\nNicheNest Team`;

        sendEmail({
          email: user.email,
          subject,
          message,
        });
      } catch (error) {
        console.log("Error sending follow-up email:", error);
      }
    }
  });
};
