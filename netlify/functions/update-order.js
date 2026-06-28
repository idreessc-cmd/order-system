function normalizeOrderPayload(payload) {
  return {
    fullName: payload.fullName || payload.name || payload.studentName || "",
    generation: payload.generation || payload.grade || payload.studentGeneration || "",
    governorate: payload.governorate || payload.city || "",
    address: payload.address || payload.area || payload.location || "",
    mobilePhone: payload.mobilePhone || payload.phone || payload.contactPhone || "",
    whatsappPhone: payload.whatsappPhone || payload.whatsapp || payload.whatsappNumber || "",
    otherPhone: payload.otherPhone || payload.altPhone || payload.extraPhone || "",
    subjects: payload.subjects || payload.selectedSubjects || [],
    otherSubject: payload.otherSubject || payload.customSubject || payload.otherSubjects || "",
    packagePrice: payload.packagePrice || payload.packageType || payload.priceOption || "",
    deliveryConfirm: payload.deliveryConfirm || payload.delivery || "تم ✅",
    notes: payload.notes || payload.comments || ""
  };
}

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
    const payload = JSON.parse(event.body);
    const { orderNumber, phone, data } = payload;

    if (!orderNumber || !phone || !data) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: "بيانات غير مكتملة لتحديث الطلب." })
      };
    }
    
    console.log("update-order payload keys:", Object.keys(payload || {}));
    
    const normalizedData = normalizeOrderPayload(data);
    
    console.log("update-order data keys:", Object.keys(normalizedData || {}));

    const googleResponse = await fetch(googleScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "updateOrder",
        orderNumber,
        phone,
        data: normalizedData
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
          message: "رد Google Apps Script ليس JSON. تحقق من رابط Web App والصلاحيات والنشر.",
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
