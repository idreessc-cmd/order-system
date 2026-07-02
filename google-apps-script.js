// Google Apps Script for Tawjihi Exam Order System
// Version 4.1.1 - Vercel/API Safe + Dynamic Pricing Matrix

var PRICING_TABLE = {
"2009": {
black_white: {
2: { 4: 3.5 },
4: { 4: 5.5 },
6: { 4: 7.5 },
8: { 1: 3.5, 2: 5.5, 3: 7.5, 4: 8.5 },
10: { 4: 9.5 }
},
color: {
2: { 4: 4.5 },
4: { 4: 7 },
6: { 4: 9.5 },
8: { 1: 4.5, 2: 7, 3: 9.5, 4: 11 },
10: { 4: 13 }
}
},
"BTEC": {
black_white: {
2: { 3: 3.5 },
4: { 3: 5 },
6: { 3: 6 },
8: { 1: 3.5, 3: 7 }
},
color: {
2: { 3: 4.5 },
4: { 3: 6.5 },
6: { 3: 8 },
8: { 1: 4.5, 3: 9.5 }
}
},
"2008": {
black_white: {
4: { 1: 2.5 },
8: { 1: 4 },
10: { 1: 5 }
},
color: {
4: { 1: 3.5 },
8: { 1: 5.5 },
10: { 1: 7 }
}
}
};

function doGet() {
return jsonResponse({
success: true,
message: "Exam Success VIP API is working",
version: "4.1.1"
});
}

function doPost(e) {
try {
if (!e || !e.postData || !e.postData.contents) {
return jsonResponse({
success: false,
message: "لم يتم استلام بيانات الطلب."
});
}

var payload = JSON.parse(e.postData.contents || "{}");
var action = toText(payload.action);

var response;

if (action === "submitOrder") {
  response = submitOrder(payload.data || payload);
} else if (action === "findOrder") {
  response = findOrder(payload);
} else if (action === "updateOrder") {
  response = updateOrder(payload);
} else if (action === "getSubjects") {
  response = getSubjects();
} else if (action === "adminGetSubjects") {
  response = adminGetSubjects();
} else if (action === "adminSaveSubject") {
  response = adminSaveSubject(payload.subject || payload.data || {});
} else if (action === "adminDeleteSubject") {
  response = adminDeleteSubject(payload.id || payload.subjectId);
} else {
  response = {
    success: false,
    message: "إجراء غير معروف (Unknown action)",
    receivedAction: action
  };
}

return jsonResponse(response);

} catch (error) {
console.error("Error in doPost:", error);

return jsonResponse({
  success: false,
  message: "حدث خطأ في معالجة الطلب على خادم جوجل: " + safeError(error),
  stack: error.stack || ""
});

}
}

function safeError(error) {
  try {
    if (error === null || error === undefined) {
      return "Unknown error";
    }
    if (typeof error === "string") {
      return error;
    }
    if (error.message) {
      return String(error.message);
    }
    return String(error);
  } catch (e) {
    return "Unknown error";
  }
}

function jsonResponse(data) {
return ContentService
.createTextOutput(JSON.stringify(data))
.setMimeType(ContentService.MimeType.JSON);
}

/* =========================
Pricing
========================= */

function calculatePricing(generation, subjectsCount, printType, modelsCount) {
  generation = toText(generation);
  printType = toText(printType);
  modelsCount = parseInt(modelsCount, 10) || 0;
  subjectsCount = parseInt(subjectsCount, 10) || 0;

  if (!generation || subjectsCount <= 0 || !printType || !modelsCount) {
    return {
      available: false,
      materialsPrice: 0,
      deliveryFee: 0,
      total: 0,
      message: "بيانات التسعير غير مكتملة."
    };
  }

  var genKey = getGenerationKey(generation);
  var rules = getPricingRules();
  
  var matchingRule = null;
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    if (
      rule.status === "active" &&
      rule.category === genKey &&
      rule.printType === printType &&
      rule.modelsCount === modelsCount
    ) {
      if (genKey === "2008") {
        if (rule.subjectsCount === 1) {
          matchingRule = rule;
          break;
        }
      } else {
        if (rule.subjectsCount === subjectsCount) {
          matchingRule = rule;
          break;
        }
      }
    }
  }

  if (!matchingRule) {
    var btecMsg = (genKey === "BTEC" && subjectsCount === 2) 
      ? "لا يوجد عرض متاح لمادتين في بيتيك، يرجى اختيار مادة واحدة أو ثلاث مواد." 
      : "لا يوجد عرض متاح لهذا الاختيار، يرجى تعديل عدد المواد أو عدد النماذج.";
    return {
      available: false,
      materialsPrice: 0,
      deliveryFee: 0,
      total: 0,
      message: btecMsg
    };
  }

  var materialsPrice = 0;
  if (genKey === "2008") {
    materialsPrice = matchingRule.price * subjectsCount;
  } else {
    materialsPrice = matchingRule.price;
  }

  var deliveryFee = 1.0;
  var total = materialsPrice + deliveryFee;

  return {
    available: true,
    materialsPrice: materialsPrice,
    deliveryFee: deliveryFee,
    total: total,
    message: ""
  };
}

function submitOrder(data) {
var lock = LockService.getScriptLock();

try {
lock.waitLock(30000);
} catch (e) {
return {
success: false,
message: "السيرفر مشغول حالياً بطلبات أخرى."
};
}

try {
data = data || {};

var validation = validateOrderData(data);

if (!validation.success) {
  return validation;
}

var sheet = getOrCreateOrdersSheet();
var headers = getOrderHeaders();

var props = PropertiesService.getScriptProperties();
var lastNumStr = props.getProperty("LAST_ORDER_NUMBER");
var lastNum = 100000;

if (lastNumStr) {
  lastNum = parseInt(lastNumStr, 10);
} else {
  var lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    var lastCellVal = toText(sheet.getRange(lastRow, 2).getValue());
    var match = lastCellVal.match(/VIP-(\d+)/);

    if (match) {
      lastNum = parseInt(match[1], 10);
    }
  }
}

var nextNum = lastNum + 1;
props.setProperty("LAST_ORDER_NUMBER", nextNum.toString());

var orderId = "VIP-" + nextNum;
var timestamp = new Date();

var subjects = Array.isArray(data.subjects) ? data.subjects : [];
var subjectsStr = subjects.join(", ");
var subjectsCount = subjects.length;

var pricing = calculatePricing(
  toText(data.generation),
  subjectsCount,
  toText(data.printType),
  parseInt(data.modelsCount, 10) || 0
);

if (!pricing.available) {
  return {
    success: false,
    message: pricing.message || "خيار السعر غير متاح لهذا الطلب."
  };
}

var rowData = [
  timestamp,
  orderId,
  toText(data.fullName),
  toText(data.generation),
  toText(data.governorate),
  toText(data.address),
  phoneAsText(data.mobilePhone),
  phoneAsText(data.whatsappPhone),
  phoneAsText(data.otherPhone),
  subjectsStr,
  toText(data.otherSubject),
  "",
  toText(data.deliveryConfirm),
  toText(data.notes),
  toText(data.printType),
  toText(data.modelsCount),
  pricing.materialsPrice,
  pricing.deliveryFee,
  pricing.total,
  "جديد",
  "",
  0
];

formatPhoneColumnsAsText(sheet);
sheet.appendRow(rowData);

return {
  success: true,
  orderNumber: orderId,
  pricing: {
    materialsPrice: pricing.materialsPrice,
    deliveryFee: pricing.deliveryFee,
    total: pricing.total
  },
  message: "تم تسجيل الطلب بنجاح."
};

} catch (error) {
console.error("Error in submitOrder:", error);

return {
  success: false,
  message: "فشل حفظ الطلب في جدول البيانات: " + safeError(error),
  stack: error.stack || ""
};

} finally {
try {
lock.releaseLock();
} catch (err) {}
}
}

function findOrder(data) {
try {
data = data || {};

var sheet = getOrCreateOrdersSheet();
var lastRow = sheet.getLastRow();

if (lastRow <= 1) {
  return {
    success: false,
    message: "لا يوجد طلبات مسجلة في النظام بعد."
  };
}

var orderNumber = toText(data.orderNumber).toUpperCase();
var phoneInput = normalizePhone(data.phone);

if (!orderNumber || !phoneInput) {
  return {
    success: false,
    message: "يرجى إدخال رقم الطلب ورقم الهاتف."
  };
}

var headers = getOrderHeaders();
var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();

for (var i = 0; i < values.length; i++) {
  var row = values[i];
  var rowOrderId = toText(row[1]).toUpperCase();

  if (rowOrderId === orderNumber) {
    var rowPhone = normalizePhone(row[6]);
    var rowWhatsapp = normalizePhone(row[7]);
    var rowAltPhone = normalizePhone(row[8]);

    if (phoneInput === rowPhone || phoneInput === rowWhatsapp || phoneInput === rowAltPhone) {
      return {
        success: true,
        order: {
          fullName: toText(row[2]),
          generation: toText(row[3]),
          governorate: toText(row[4]),
          address: toText(row[5]),
          mobilePhone: toText(row[6]),
          whatsappPhone: toText(row[7]),
          otherPhone: toText(row[8]),
          subjects: row[9] ? toText(row[9]).split(", ") : [],
          otherSubject: toText(row[10]),
          packagePrice: toText(row[11]),
          deliveryConfirm: toText(row[12]),
          notes: toText(row[13]),
          printType: toText(row[14]),
          modelsCount: toText(row[15]),
          materialsPrice: toText(row[16]),
          deliveryFee: toText(row[17]),
          total: toText(row[18])
        }
      };
    }
  }
}

return {
  success: false,
  message: "لم يتم العثور على طلب مطابق. تأكد من رقم الطلب ورقم الهاتف الصحيح المستخدم عند التسجيل."
};

} catch (error) {
console.error("Error in findOrder:", error);

return {
  success: false,
  message: "حدث خطأ أثناء البحث عن الطلب: " + safeError(error),
  stack: error.stack || ""
};

}
}

function updateOrder(payload) {
var lock = LockService.getScriptLock();

try {
lock.waitLock(30000);
} catch (e) {
return {
success: false,
message: "السيرفر مشغول حالياً، يرجى المحاولة مرة أخرى."
};
}

try {
payload = payload || {};

var sheet = getOrCreateOrdersSheet();
var headers = getOrderHeaders();
var lastRow = sheet.getLastRow();

if (lastRow <= 1) {
  return {
    success: false,
    message: "لا يوجد طلبات لتحديثها."
  };
}

var orderNumber = toText(payload.orderNumber).toUpperCase();
var phoneInput = normalizePhone(payload.phone);
var data = payload.data || {};

if (!orderNumber || !phoneInput) {
  return {
    success: false,
    message: "يرجى إدخال رقم الطلب ورقم الهاتف."
  };
}

var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
var rowIndex = -1;
var currentEditCount = 0;
var originalCreatedAt = "";

for (var i = 0; i < values.length; i++) {
  var row = values[i];
  var rowOrderId = toText(row[1]).toUpperCase();

  if (rowOrderId === orderNumber) {
    var rowPhone = normalizePhone(row[6]);
    var rowWhatsapp = normalizePhone(row[7]);
    var rowAltPhone = normalizePhone(row[8]);

    if (phoneInput === rowPhone || phoneInput === rowWhatsapp || phoneInput === rowAltPhone) {
      rowIndex = i + 2;
      currentEditCount = parseInt(row[21], 10) || 0;
      originalCreatedAt = row[0];
      break;
    }
  }
}

if (rowIndex === -1) {
  return {
    success: false,
    message: "لا يمكن تعديل الطلب. رقم الطلب أو رقم الهاتف غير مطابق للبيانات الأصلية."
  };
}

var validation = validateOrderData(data);

if (!validation.success) {
  return validation;
}

var subjects = Array.isArray(data.subjects) ? data.subjects : [];
var subjectsStr = subjects.join(", ");
var subjectsCount = subjects.length;

var pricing = calculatePricing(
  toText(data.generation),
  subjectsCount,
  toText(data.printType),
  parseInt(data.modelsCount, 10) || 0
);

if (!pricing.available) {
  return {
    success: false,
    message: pricing.message || "خيار السعر غير متاح لهذا الطلب."
  };
}

var timestamp = new Date();

var updatedRow = [
  originalCreatedAt,
  orderNumber,
  toText(data.fullName),
  toText(data.generation),
  toText(data.governorate),
  toText(data.address),
  phoneAsText(data.mobilePhone),
  phoneAsText(data.whatsappPhone),
  phoneAsText(data.otherPhone),
  subjectsStr,
  toText(data.otherSubject),
  "",
  toText(data.deliveryConfirm),
  toText(data.notes),
  toText(data.printType),
  toText(data.modelsCount),
  pricing.materialsPrice,
  pricing.deliveryFee,
  pricing.total,
  "تم التعديل",
  timestamp,
  currentEditCount + 1
];

formatPhoneColumnsAsText(sheet);

sheet.getRange(rowIndex, 1, 1, headers.length).setValues([updatedRow]);

return {
  success: true,
  orderNumber: orderNumber,
  pricing: {
    materialsPrice: pricing.materialsPrice,
    deliveryFee: pricing.deliveryFee,
    total: pricing.total
  },
  message: "تم تعديل طلبكم بنجاح."
};

} catch (error) {
console.error("Error in updateOrder:", error);

return {
  success: false,
  message: "فشل تحديث الطلب في جدول البيانات: " + safeError(error),
  stack: error.stack || ""
};

} finally {
try {
lock.releaseLock();
} catch (err) {}
}
}

/* =========================
Validation + Helpers
========================= */

function validateOrderData(data) {
data = data || {};

if (!toText(data.fullName)) {
return {
success: false,
message: "يرجى إدخال الاسم الكامل."
};
}

if (!toText(data.generation)) {
return {
success: false,
message: "يرجى اختيار الصف / الجيل."
};
}

if (!toText(data.governorate)) {
return {
success: false,
message: "يرجى اختيار المحافظة."
};
}

if (!toText(data.address)) {
return {
success: false,
message: "يرجى إدخال المنطقة / العنوان التفصيلي."
};
}

if (!toText(data.mobilePhone)) {
return {
success: false,
message: "يرجى إدخال رقم موبايل للتواصل."
};
}

if (!toText(data.whatsappPhone)) {
return {
success: false,
message: "يرجى إدخال رقم واتساب للتواصل."
};
}

if (!toText(data.otherPhone)) {
return {
success: false,
message: "يرجى إدخال رقم هاتف آخر."
};
}

var hasSubjects =
Array.isArray(data.subjects) &&
data.subjects.filter(function (item) {
return !!toText(item);
}).length > 0;

var hasOtherSubject = !!toText(data.otherSubject);

if (!hasSubjects && !hasOtherSubject) {
return {
success: false,
message: "يرجى اختيار مادة واحدة على الأقل أو كتابة مادة أخرى."
};
}

if (!toText(data.printType)) {
return {
success: false,
message: "يرجى اختيار نوع الطباعة."
};
}

if (!toText(data.modelsCount)) {
return {
success: false,
message: "يرجى اختيار عدد النماذج لكل مادة."
};
}

return {
success: true
};
}

function formatPhoneColumnsAsText(sheet) {
sheet.getRange("G:I").setNumberFormat("@");
}

function phoneAsText(value) {
if (value === null || value === undefined) {
return "";
}

var text = value.toString().trim().replace(/^'/, "");

return text ? "'" + text : "";
}

function toText(value) {
if (value === null || value === undefined) {
return "";
}

return String(value).replace(/^'/, "").trim();
}

function normalizePhone(phone) {
if (!phone) {
return "";
}

var digits = phone.toString().replace(/\D/g, "");

if (digits.indexOf("00962") === 0) {
digits = digits.substring(5);
} else if (digits.indexOf("962") === 0) {
digits = digits.substring(3);
} else if (digits.indexOf("0") === 0) {
digits = digits.substring(1);
}

return digits;
}


/* ========================================================
   Migration & Dynamic Pricing Sheets Functions
   ======================================================== */

function migrateBtecSubjects(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  var range = sheet.getRange(2, 1, lastRow - 1, 9);
  var values = range.getValues();
  var changed = false;
  
  for (var i = 0; i < values.length; i++) {
    var category = String(values[i][4]).trim();
    if (category === "BTEC") {
      var name = String(values[i][1]).trim();
      var currentStatus = String(values[i][5]).trim();
      var currentDesc = String(values[i][3]).trim();
      var newStatus = currentStatus;
      var newDesc = currentDesc;
      
      // إذا كان يحتوي على إنجليزي أو English
      if (name.indexOf("إنجليزي") !== -1 || name.toLowerCase().indexOf("english") !== -1) {
        newStatus = "disabled";
        newDesc = "";
      } else {
        newDesc = "";
      }
      
      if (currentStatus !== newStatus || currentDesc !== newDesc) {
        values[i][5] = newStatus;
        values[i][3] = newDesc;
        values[i][8] = new Date();
        changed = true;
      }
    }
  }
  
  if (changed) {
    range.setValues(values);
  }
}

function getOrCreatePricingSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Pricing");
  
  if (!sheet) {
    sheet = ss.insertSheet("Pricing");
    
    var headers = [
      "category",
      "printType",
      "modelsCount",
      "subjectsCount",
      "price",
      "status",
      "updatedAt"
    ];
    sheet.appendRow(headers);
    ensurePricingInitialized(sheet);
  }
  
  return sheet;
}

function ensurePricingInitialized(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) return;
  
  var now = new Date();
  
  var initialPricing = [
    // 2009 black_white
    ["2009", "black_white", 2, 4, 3.5, "active", now],
    ["2009", "black_white", 4, 4, 5.5, "active", now],
    ["2009", "black_white", 6, 4, 7.5, "active", now],
    ["2009", "black_white", 8, 1, 3.5, "active", now],
    ["2009", "black_white", 8, 2, 5.5, "active", now],
    ["2009", "black_white", 8, 3, 7.5, "active", now],
    ["2009", "black_white", 8, 4, 8.5, "active", now],
    ["2009", "black_white", 10, 4, 9.5, "active", now],

    // 2009 color
    ["2009", "color", 2, 4, 4.5, "active", now],
    ["2009", "color", 4, 4, 7, "active", now],
    ["2009", "color", 6, 4, 9.5, "active", now],
    ["2009", "color", 8, 1, 4.5, "active", now],
    ["2009", "color", 8, 2, 7, "active", now],
    ["2009", "color", 8, 3, 9.5, "active", now],
    ["2009", "color", 8, 4, 11, "active", now],
    ["2009", "color", 10, 4, 13, "active", now],

    // BTEC black_white
    ["BTEC", "black_white", 2, 3, 3.5, "active", now],
    ["BTEC", "black_white", 4, 3, 5, "active", now],
    ["BTEC", "black_white", 6, 3, 6, "active", now],
    ["BTEC", "black_white", 8, 1, 3.5, "active", now],
    ["BTEC", "black_white", 8, 3, 7, "active", now],

    // BTEC color
    ["BTEC", "color", 2, 3, 4.5, "active", now],
    ["BTEC", "color", 4, 3, 6.5, "active", now],
    ["BTEC", "color", 6, 3, 8, "active", now],
    ["BTEC", "color", 8, 1, 4.5, "active", now],
    ["BTEC", "color", 8, 3, 9.5, "active", now],

    // 2008 black_white
    ["2008", "black_white", 4, 1, 2.5, "active", now],
    ["2008", "black_white", 8, 1, 4, "active", now],
    ["2008", "black_white", 10, 1, 5, "active", now],

    // 2008 color
    ["2008", "color", 4, 1, 3.5, "active", now],
    ["2008", "color", 8, 1, 5.5, "active", now],
    ["2008", "color", 10, 1, 7, "active", now]
  ];
  
  for (var i = 0; i < initialPricing.length; i++) {
    sheet.appendRow(initialPricing[i]);
  }
}

function getPricingRules() {
  try {
    var sheet = getOrCreatePricingSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];
    
    var values = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
    var rules = [];
    
    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      rules.push({
        category: String(row[0]).trim(),
        printType: String(row[1]).trim(),
        modelsCount: Number(row[2]) || 0,
        subjectsCount: Number(row[3]) || 0,
        price: Number(row[4]) || 0,
        status: String(row[5]).trim(),
        updatedAt: row[6]
      });
    }
    return rules;
  } catch (error) {
    console.error("Error in getPricingRules:", error);
    return [];
  }
}

function adminGetPricing() {
  try {
    var rules = getPricingRules();
    return {
      success: true,
      pricing: rules
    };
  } catch (error) {
    return {
      success: false,
      message: "فشل جلب قائمة الأسعار: " + safeError(error)
    };
  }
}

function adminSavePricing(rule) {
  try {
    var sheet = getOrCreatePricingSheet();
    var lastRow = sheet.getLastRow();
    
    var category = String(rule.category || "").trim();
    var printType = String(rule.printType || "").trim();
    var modelsCount = Number(rule.modelsCount) || 0;
    var subjectsCount = Number(rule.subjectsCount) || 0;
    var price = Number(rule.price) || 0;
    var status = String(rule.status || "active").trim();
    var now = new Date();
    
    if (!category || !printType || !modelsCount || !subjectsCount) {
      return { success: false, message: "بيانات غير مكتملة لحفظ قاعدة التسعير." };
    }
    
    var foundIndex = -1;
    if (lastRow > 1) {
      var values = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
      for (var i = 0; i < values.length; i++) {
        if (
          String(values[i][0]).trim() === category &&
          String(values[i][1]).trim() === printType &&
          Number(values[i][2]) === modelsCount &&
          Number(values[i][3]) === subjectsCount
        ) {
          foundIndex = i + 2;
          break;
        }
      }
    }
    
    if (foundIndex !== -1) {
      sheet.getRange(foundIndex, 5).setValue(price);
      sheet.getRange(foundIndex, 6).setValue(status);
      sheet.getRange(foundIndex, 7).setValue(now);
    } else {
      sheet.appendRow([category, printType, modelsCount, subjectsCount, price, status, now]);
    }
    
    return {
      success: true,
      message: "تم حفظ قاعدة التسعير بنجاح."
    };
  } catch (error) {
    return {
      success: false,
      message: "فشل حفظ قاعدة التسعير: " + safeError(error)
    };
  }
}

function adminDisablePricing(rule) {
  try {
    var sheet = getOrCreatePricingSheet();
    var lastRow = sheet.getLastRow();
    
    var category = String(rule.category || "").trim();
    var printType = String(rule.printType || "").trim();
    var modelsCount = Number(rule.modelsCount) || 0;
    var subjectsCount = Number(rule.subjectsCount) || 0;
    var now = new Date();
    
    if (!category || !printType || !modelsCount || !subjectsCount) {
      return { success: false, message: "بيانات غير مكتملة لتعطيل قاعدة التسعير." };
    }
    
    var foundIndex = -1;
    if (lastRow > 1) {
      var values = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
      for (var i = 0; i < values.length; i++) {
        if (
          String(values[i][0]).trim() === category &&
          String(values[i][1]).trim() === printType &&
          Number(values[i][2]) === modelsCount &&
          Number(values[i][3]) === subjectsCount
        ) {
          foundIndex = i + 2;
          break;
        }
      }
    }
    
    if (foundIndex !== -1) {
      sheet.getRange(foundIndex, 6).setValue("disabled");
      sheet.getRange(foundIndex, 7).setValue(now);
      return {
        success: true,
        message: "تم تعطيل قاعدة التسعير بنجاح."
      };
    } else {
      return {
        success: false,
        message: "لم يتم العثور على قاعدة التسعير المطلوبة."
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "فشل تعطيل قاعدة التسعير: " + safeError(error)
    };
  }
}
