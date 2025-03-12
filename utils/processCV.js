import { parseCV } from "./cvParser.js";
import { storeInGoogleSheet } from "./googleSheets.js";
import { sendWebhookNotification } from "./webhook.js";
import { scheduleFollowUpEmail } from "./followUpEmail.js";

export const processCV = async (filePath, cvPublicLink, applicantEmail) => {
  try {
    const cvData = await parseCV(filePath);

    await storeInGoogleSheet(cvData, cvPublicLink);

    await sendWebhookNotification(cvData, applicantEmail, "testing");

    scheduleFollowUpEmail();

    console.log("CV processing complete.");
  } catch (error) {
    console.error("Error processing CV:", error);
  }
};
