import axios from "axios";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse"; 

export const parseCV = async (cvUrl) => {
  try {
    if (!cvUrl) throw new Error("No CV URL provided.");

    const tempFilePath = path.join("temp", "resume.pdf");

    const response = await axios({
      method: "GET",
      url: cvUrl,
      responseType: "arraybuffer",
    });

    fs.writeFileSync(tempFilePath, response.data);

    const dataBuffer = fs.readFileSync(tempFilePath);
    const pdfData = await pdfParse(dataBuffer);

    const text = pdfData.text;
    const parsedCVData = extractDetailsFromText(text);

    fs.unlinkSync(tempFilePath);

    return parsedCVData;
  } catch (error) {
    console.error("❌ Failed to parse CV:", error.message);
    throw new Error("CV Parsing Failed.");
  }
};

const extractDetailsFromText = (text) => {
  return {
    name: text.match(/Name:\s*(.*)/)?.[1] || "N/A",
    email: text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || "N/A",
    phone: text.match(/\+?\d{10,15}/)?.[0] || "N/A",
    education: text.includes("Education") ? "Found" : "N/A",
    experience: text.includes("Experience") ? "Found" : "N/A",
  };
};
