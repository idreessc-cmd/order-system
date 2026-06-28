import crypto from 'crypto';

function verifyToken(token, secret) {
  try {
    if (!token) return false;
    // دعم ترويسة Bearer أو التوكن المباشر
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

export const handler = async (event, context) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, message: "Method Not Allowed. Only GET is supported." })
    };
  }

  const token = event.headers.authorization || event.headers.Authorization;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!verifyToken(token, adminSecret)) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, message: "غير مصرح لك بالدخول. التوكن غير صالح أو منتهي الصلاحية." })
    };
  }

  const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (!googleScriptUrl) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, message: "متغير البيئة GOOGLE_SCRIPT_URL غير معرف." })
    };
  }

  try {
    const googleResponse = await fetch(googleScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "adminGetSubjects"
      }),
    });

    const rawText = await googleResponse.text();

    let result;
    try {
      result = JSON.parse(rawText);
    } catch (parseError) {
      console.error("Google Apps Script raw response:", rawText.slice(0, 3000));
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          message: "رد Google Apps Script ليس JSON.",
          debug: rawText.slice(0, 3000),
        }),
      };
    }

    if (!googleResponse.ok || !result.success) {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          message: result.message || "فشل تنفيذ العملية داخل Google Apps Script.",
          debug: result,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error("Error in admin-get-subjects function:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, message: "فشل الاتصال بخدمة Google Sheets: " + error.message })
    };
  }
};
