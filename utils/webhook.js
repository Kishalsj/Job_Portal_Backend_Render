import axios from "axios";

export const sendWebhookNotification = async (cvData, email, status = "testing") => {
  const payload = {
    cv_data: {
      personal_info: cvData.personal_info,
      education: cvData.education,
      qualifications: cvData.qualifications,
      projects: cvData.projects,
      cv_public_link: cvData.cvPublicLink,
    },
    metadata: {
      applicant_name: cvData.personal_info.name,
      email: email,
      status: status,
      cv_processed: true,
      processed_timestamp: new Date().toISOString(),
    },
  };

  try {
    const response = await axios.post("https://rnd-assignment.automations-3d6.workers.dev/", payload, {
      headers: {
        "X-Candidate-Email": email,
        "Content-Type": "application/json",
      },
    });

    console.log("Webhook sent successfully:", response.data);
  } catch (error) {
    console.error("Error sending webhook:", error);
  }
};
