import crypto from 'crypto';

function verifyToken(token, secret) {
  try {
    if (!token) return false;
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    const parts = cleanToken.split('.');
    if (parts.length !== 3) return false;
    const [header, payload, signature] = parts;
    
    const expectedSignature = crypto.createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');
      
    if (signature !== expectedSignature) return false;
    
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (decodedPayload.exp < Date.now()) return false;
    
    return true;
  } catch (e) {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, message: "Method Not Allowed. Only POST is supported." });
  }

  const token = req.headers.authorization || req.headers.Authorization;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!verifyToken(token, adminSecret)) {
    return res.status(401).json({ success: false, message: "غير مصرح لك بالدخول. التوكن غير صالح أو منتهي الصلاحية." });
  }

  const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (!googleScriptUrl) {
    return res.status(500).json({ success: false, message: "متغير البيئة GOOGLE_SCRIPT_URL غير معرف." });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    const googleResponse = await fetch(googleScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "adminSaveSubject",
        subject: payload
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
    console.error("Error in admin-save-subject API:", error);
    return res.status(500).json({ success: false, message: "فشل الاتصال بخدمة Google Sheets: " + error.message });
  }
}
