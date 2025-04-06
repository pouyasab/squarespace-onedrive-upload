const formidable = require('formidable');
const fs = require('fs');
const axios = require('axios');

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Kun POST støttes");
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).send("Feil ved parsing");

    const file = files.file;
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
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const token = tokenRes.data.access_token;

      await axios.put(
        `https://graph.microsoft.com/v1.0/me/drive/root:/Uploads/${filename}:/content`,
        stream,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": file.mimetype,
          },
        }
      );

      res.status(200).send("Fil lastet opp!");
    } catch (e) {
      console.error(e.response?.data || e.message);
      res.status(500).send("Feil under opplasting");
    }
  });
}
