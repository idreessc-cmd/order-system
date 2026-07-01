export default async function handler(req, res) {
  try {
    const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

    if (!GOOGLE_SCRIPT_URL) {
      return res.status(500).json({
        success: false,
        message: "GOOGLE_SCRIPT_URL غير موجود في Vercel Environment Variables."
      });
    }

    const googleResponse = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action: "getSubjects"
      })
    });

    const rawText = await googleResponse.text();

    let result;
    try {
      result = JSON.parse(rawText);
    } catch (parseError) {
      console.error("Google Apps Script non-JSON response:", rawText.slice(0, 3000));

      return res.status(502).json({
        success: false,
        message: "رد Google Apps Script ليس JSON صالح.",
        debug: rawText.slice(0, 1000)
      });
    }

    if (!googleResponse.ok || !result.success) {
      console.error("Google Apps Script returned error:", result);

      return res.status(502).json({
        success: false,
        message: result.message || "فشل جلب المواد من Google Apps Script.",
        debug: result
      });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("Error in /api/get-subjects:", error);

    return res.status(500).json({
      success: false,
      message: "حدث خطأ داخلي في /api/get-subjects.",
      debug: error.message
    });
  }
}
