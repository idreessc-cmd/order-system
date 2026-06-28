export const handler = async (event, context) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { 
        "Content-Type": "application/json",
        "Allow": "GET"
      },
      body: JSON.stringify({ success: false, message: "Method Not Allowed. Only GET is supported." })
    };
  }

  const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (!googleScriptUrl) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        success: false, 
        message: "تهيئة السيرفر غير مكتملة: متغير البيئة GOOGLE_SCRIPT_URL غير معرف." 
      })
    };
  }

  try {
    const googleResponse = await fetch(googleScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "getSubjects"
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
    console.error("Error in get-subjects function:", error);
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
