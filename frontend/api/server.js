import express from "express";
import multer from "multer";
import axios from "axios";
import cors from "cors";
import fs from "fs";
import * as cheerio from "cheerio";

import FormData from "form-data";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
// Ensure dotenv loads from the correct directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

console.log("Loaded API Key:", process.env.PINATA_API_KEY);
console.log("Loaded Secret Key:", process.env.PINATA_SECRET_API_KEY);

const app = express();
const PORT = 5000;
const ETHERSCAN_TX_BASE_URL = "https://sepolia.etherscan.io/tx/";

// Allow frontend to communicate with backend
app.use(cors());
app.use(express.json());

// Multer setup for handling file uploads
const upload = multer({ dest: "uploads/" });

/**
 * Upload file to Pinata (IPFS)
 */
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Prepare form data for Pinata
    const formData = new FormData();
    formData.append("file", fs.createReadStream(req.file.path));

    const metadata = JSON.stringify({ name: req.file.originalname });
    formData.append("pinataMetadata", metadata);
    formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

    // Send to Pinata
    const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      headers: {
        "Content-Type": `multipart/form-data`,
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
      },
    });

    // Delete file after upload
    fs.unlinkSync(req.file.path);

    // Return CID to frontend
    res.json({ cid: response.data.IpfsHash });

  } catch (error) {
    console.error("Error uploading to Pinata:", error);
    res.status(500).json({ error: "Pinata upload failed" });
  }
});

/**
 * Fetch and return decoded input data from Etherscan
 */
app.get("/decode-input", async (req, res) => {
  const { txHash } = req.query;
  if (!txHash) {
    return res.status(400).json({ error: "Transaction hash is required" });
  }

  try {
    const response = await axios.get(`${ETHERSCAN_TX_BASE_URL}${txHash}`);
    const $ = cheerio.load(response.data);

    // Extract Decoded Input Data
    let decodedInput = "";
    $("h2:contains('More Details')").nextAll("div").each((_, el) => {
      const text = $(el).text().trim();
      if (text.includes("Function") || text.includes("MethodID")) {
        decodedInput += text + "\n";
      }
    });

    if (!decodedInput) {
      decodedInput = "No decoded input data found.";
    }

    res.json({ decodedInput });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Failed to fetch data from Etherscan" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
