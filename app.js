import express from "express";
import { config } from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "fs";
import fileUpload from "express-fileupload";
import { connection } from "./database/connection.js";
import { errorMiddleware } from "./middlewares/error.js";
import userRouter from "./routes/userRouter.js";
import jobRouter from "./routes/jobRouter.js";
import applicationRouter from "./routes/applicationRouter.js";
import { newsLetterCron } from "./automation/newsLetterCron.js";
import { scheduleFollowUpEmail } from "./automation/followUpEmail.js";
import { sendWebhookNotification } from "./utils/webhook.js"; 

const app = express();
config({ path: "./.env" });

app.use(
  cors({
    origin: [process.env.FRONTEND_URL],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);


const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}


app.use("/api/v1/user", userRouter);
app.use("/api/v1/job", jobRouter);
app.use("/api/v1/application", applicationRouter);


app.post("/api/v1/upload-cv", async (req, res) => {
  try {
    if (!req.files || !req.files.cv) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const cvFile = req.files.cv;
    const uploadPath = `uploads/${cvFile.name}`;
    await cvFile.mv(uploadPath); 

    const cvPublicLink = `https://your-storage.com/${cvFile.name}`;
    

    const applicantEmail = req.body.email;
    if (!applicantEmail) {
      return res.status(400).json({ error: "Applicant email is required." });
    }


    const extractedData = await processCV(uploadPath, cvPublicLink, applicantEmail);

    await sendWebhookNotification({
      cv_data: extractedData,
      metadata: {
        applicant_name: extractedData.personal_info?.name || "Unknown",
        email: extractedData.personal_info?.email || applicantEmail,
        status: "testing", 
        cv_processed: true,
        processed_timestamp: new Date().toISOString(),
      },
    });

    scheduleFollowUpEmail(applicantEmail, extractedData.personal_info?.name || "Applicant");

    res.status(200).json({ message: "CV processed successfully." });
  } catch (error) {
    console.error("Error processing CV:", error);
    res.status(500).json({ error: "Error processing CV." });
  }
});


newsLetterCron();
connection();
app.use(errorMiddleware);

export default app;
