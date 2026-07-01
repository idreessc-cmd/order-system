function normalizeOrderPayload(payload) {
  return {
    fullName: String(payload.fullName || payload.name || payload.studentName || "").trim(),
    generation: String(payload.generation || payload.grade || payload.studentGeneration || "").trim(),
    governorate: String(payload.governorate || payload.city || "").trim(),
    address: String(payload.address || payload.area || payload.location || "").trim(),
    mobilePhone: String(payload.mobilePhone || payload.phone || payload.contactPhone || "").trim(),
    whatsappPhone: String(payload.whatsappPhone || payload.whatsapp || payload.whatsappNumber || "").trim(),
    otherPhone: String(payload.otherPhone || payload.altPhone || payload.extraPhone || "").trim(),
    subjects: payload.subjects || payload.selectedSubjects || [],
    otherSubject: String(payload.otherSubject || payload.customSubject || payload.otherSubjects || "").trim(),
    packagePrice: String(payload.packagePrice || payload.packageType || payload.priceOption || "").trim(),
    deliveryConfirm: String(payload.deliveryConfirm || payload.delivery || "تم ✅").trim(),
    notes: String(payload.notes || payload.comments || "").trim(),
    printType: String(payload.printType || "").trim(),
    modelsCount: String(payload.modelsCount || "").trim()
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
