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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, message: "Method Not Allowed. Only POST is supported." });
  }

  try {
    const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
    if (!GOOGLE_SCRIPT_URL) {
      return res.status(500).json({ 
        success: false, 
        message: "GOOGLE_SCRIPT_URL غير موجود في Vercel Environment Variables." 
      });
    }

    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { orderNumber, phone, data } = payload;

    if (!orderNumber || !phone || !data) {
      return res.status(400).json({ success: false, message: "بيانات غير مكتملة لتحديث الطلب." });
    }

    const normalizedData = normalizeOrderPayload(data);

    const googleResponse = await fetch(GOOGLE_SCRIPT_URL, {
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
      console.error("Google Apps Script non-JSON response:", rawText.slice(0, 3000));
      return res.status(502).json({
        success: false,
        message: "رد Google Apps Script ليس JSON صالح.",
        debug: rawText.slice(0, 1000),
      });
    }

    if (!googleResponse.ok || !result.success) {
      console.error("Google Apps Script returned error:", result);
      return res.status(502).json({
        success: false,
        message: result.message || "فشل تنفيذ العملية داخل Google Apps Script.",
        debug: result,
      });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("Error in update-order API:", error);
    return res.status(500).json({ 
      success: false, 
      message: "حدث خطأ داخلي في /api/update-order.",
      debug: error.message 
    });
  }
}
