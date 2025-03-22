import multer from "multer";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";

const upload = multer({ dest: "/tmp" });
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  upload.single("file")(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ error: "File upload failed" });
    }

    try {
      const file = req.file;
      const formData = new FormData();
      formData.append("file", fs.createReadStream(file.path));

      const metadata = JSON.stringify({ name: file.originalname });
      formData.append("pinataMetadata", metadata);
      formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

      const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        headers: {
          "Content-Type": `multipart/form-data`,
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
      });

      fs.unlinkSync(file.path);
      return res.status(200).json({ cid: response.data.IpfsHash });

    } catch (error) {
      console.error("Upload failed:", error);
      return res.status(500).json({ error: "Pinata upload failed" });
    }
  });
}
