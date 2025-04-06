import formidable from 'formidable';
import fs from 'fs';
import axios from 'axios';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).send("Kun POST-støtte");
  }

  const form = formidable({}); // ✅ riktig måte i Formidable v3+

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Formidable-feil:", err);
      return res.status(500).send("Feil ved parsing");
    }

    const file = files.file;
    if (!file) {
      return res.status(400).send("Ingen fil mottatt");
    }

    const stream = fs.createReadStream(file.filepath);
    const filename = file.originalFilename;

    try {
      const tokenRes = await axios.post(
        `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials"
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        }
      );

      const token = tokenRes.data.access_token;

      await axios.put(
        `https://graph.microsoft.com/v1.0/me/drive/root:/Uploads/${filename}:/content`,
        stream,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": file.mimetype
          }
        }
      );

      return res.status(200).send("Fil lastet opp til OneDrive!");
    } catch (error) {
      console.error("Opplasting-feil:", error.response?.data || error.message);
      return res.status(500).send("Feil under opplasting");
    }
  });
}
