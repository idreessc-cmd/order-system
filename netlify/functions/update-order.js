export const handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { 
        "Content-Type": "application/json",
        "Allow": "POST"
      },
      body: JSON.stringify({ success: false, message: "Method Not Allowed. Only POST is supported." })
    };
  }

  const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (!googleScriptUrl) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        success: false, 
        message: "تهيئة السيرفر غير مكتملة: متغير البيئة GOOGLE_SCRIPT_URL غير معرف في Netlify." 
      })
    };
  }

  try {
    const { orderNumber, phone, data } = JSON.parse(event.body);

    if (!orderNumber || !phone || !data) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: "بيانات غير مكتملة لتحديث الطلب." })
      };
    }
    
    // Forward the request to Google Apps Script Web App
    const response = await fetch(googleScriptUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "text/plain;charset=utf-8" 
      },
      body: JSON.stringify({
        action: "updateOrder",
        orderNumber,
        phone,
        ...data
      })
    });

    if (!response.ok) {
      throw new Error(`Google Apps Script returned status ${response.status}`);
    }

    const result = await response.json();

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error("Error in update-order function:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        success: false, 
        message: "فشل الاتصال بخدمة Google Sheets: " + error.message 
      })
    };
  }
};
