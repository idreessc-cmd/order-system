export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, message: "Method Not Allowed. Only POST is supported." });
  }

  const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (!googleScriptUrl) {
    return res.status(500).json({ 
      success: false, 
      message: "تهيئة السيرفر غير مكتملة: متغير البيئة GOOGLE_SCRIPT_URL غير معرف في Vercel." 
    });
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { orderNumber, phone } = payload;

    if (!orderNumber || !phone) {
      return res.status(400).json({ success: false, message: "بيانات غير مكتملة للبحث عن الطلب." });
    }

    const googleResponse = await fetch(googleScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "findOrder",
        orderNumber,
        phone
      }),
    });

    const rawText = await googleResponse.text();

    let result;
    try {
      result = JSON.parse(rawText);
    } catch (parseError) {
      console.error("Google Apps Script raw response:", rawText.slice(0, 3000));
      return res.status(502).json({
        success: false,
        message: "رد Google Apps Script ليس JSON.",
        debug: rawText.slice(0, 3000),
      });
    }

    if (!googleResponse.ok || !result.success) {
      return res.status(502).json({
        success: false,
        message: result.message || "فشل تنفيذ العملية داخل Google Apps Script.",
        debug: result,
      });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("Error in find-order API:", error);
    return res.status(500).json({ 
      success: false, 
      message: "فشل الاتصال بخدمة Google Sheets: " + error.message 
    });
  }
}
