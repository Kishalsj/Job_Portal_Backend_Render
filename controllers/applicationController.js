import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Application } from "../models/applicationSchema.js";
import { Job } from "../models/jobSchema.js";
import { v2 as cloudinary } from "cloudinary";
import { parseCV } from "../utils/cvParser.js";
import { sendEmail } from "../utils/sendEmail.js"; 


export const postApplication = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { name, email, phone, address, coverLetter } = req.body;

  if (!name || !email || !phone || !address || !coverLetter) {
    return next(new ErrorHandler("All fields are required.", 400));
  }

  const jobDetails = await Job.findById(id);
  if (!jobDetails) {
    return next(new ErrorHandler("Job not found.", 404));
  }

  const isAlreadyApplied = await Application.findOne({
    "jobInfo.jobId": id,
    "jobSeekerInfo.id": req.user._id,
  });
  if (isAlreadyApplied) {
    return next(new ErrorHandler("You have already applied for this job.", 400));
  }

  const jobSeekerInfo = {
    id: req.user._id,
    name,
    email,
    phone,
    address,
    coverLetter,
    role: "Job Seeker",
  };

  let resumePath = null;
  let cvPublicLink = null;

  if (req.files && req.files.resume) {
    const { resume } = req.files;
    try {
      const cloudinaryResponse = await cloudinary.uploader.upload(resume.tempFilePath, {
        folder: "Job_Seekers_Resume",
        access_mode: "public",
      });
      if (!cloudinaryResponse || cloudinaryResponse.error) {
        return next(new ErrorHandler("Failed to upload resume to cloudinary.", 500));
      }
      jobSeekerInfo.resume = {
        public_id: cloudinaryResponse.public_id,
        url: cloudinaryResponse.secure_url,
      };
      resumePath = resume.tempFilePath;
    } catch (error) {
      console.error("❌ Failed to upload resume:", error);
      return next(new ErrorHandler("Failed to upload resume", 500));
    }
  } else if (req.user && req.user.resume?.url) {
    jobSeekerInfo.resume = {
      public_id: req.user.resume.public_id,
      url: req.user.resume.url,
    };
    resumePath = req.user.resume.url;
    cvPublicLink = req.user.resume.url;
  } else {
    return next(new ErrorHandler("Please upload your resume.", 400));
  }


  const application = await Application.create({
    jobSeekerInfo,
    employerInfo: {
      id: jobDetails.postedBy,
      role: "Employer",
    },
    jobInfo: {
      jobId: id,
      jobTitle: jobDetails.title,
    },
  });

  const subject = `Application Submitted: ${jobDetails.title} - ${jobDetails.companyName}`;
  const message = `Hi ${name},\n\nYour application for the job position of "${jobDetails.title}" at ${jobDetails.companyName} has been successfully submitted.\n\nThank you for applying, and we wish you the best of luck in the hiring process.\n\nBest regards,\nYour Team`;

  sendEmail({
    email,
    subject,
    message,
  });

  res.status(201).json({
    success: true,
    message: "Application submitted",
    application,
  });
});

export const employerGetAllApplication = catchAsyncErrors(async (req, res, next) => {
  const { _id } = req.user;
  const applications = await Application.find({
    "employerInfo.id": _id,
    "deletedBy.employer": false,
  });
  res.status(200).json({
    success: true,
    applications,
  });
});

export const jobSeekerGetAllApplication = catchAsyncErrors(async (req, res, next) => {
  const { _id } = req.user;
  const applications = await Application.find({
    "jobSeekerInfo.id": _id,
    "deletedBy.jobSeeker": false,
  });
  res.status(200).json({
    success: true,
    applications,
  });
});

export const deleteApplication = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const application = await Application.findById(id);
  if (!application) {
    return next(new ErrorHandler("Application not found.", 404));
  }

  const { role } = req.user;
  switch (role) {
    case "Job Seeker":
      application.deletedBy.jobSeeker = true;
      break;
    case "Employer":
      application.deletedBy.employer = true;
      break;
    default:
      console.log("Unknown role in delete function.");
      break;
  }

  await application.save();

  if (application.deletedBy.employer && application.deletedBy.jobSeeker) {
    await application.deleteOne();
  }

  res.status(200).json({
    success: true,
    message: "Application Deleted.",
  });
});
