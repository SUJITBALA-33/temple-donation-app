
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST மட்டும் அனுமதிக்கப்படும்" });
  }

  const scriptUrl = process.env.APPS_SCRIPT_URL;

  if (!scriptUrl) {
    return res.status(500).json({
      error: "APPS_SCRIPT_URL environment variable அமைக்கப்படவில்லை"
    });
  }

  try {
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(req.body)
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: "Apps Script JSON பதில் தரவில்லை",
        details: text.slice(0, 300)
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(502).json({
      error: "Apps Script-ஐ அணுக முடியவில்லை",
      details: String(error)
    });
  }
}
