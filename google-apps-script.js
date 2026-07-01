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

```
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
```

} catch (error) {
console.error("Error in doPost:", error);

```
return jsonResponse({
  success: false,
  message: "حدث خطأ في معالجة الطلب على خادم جوجل: " + error.toString(),
  stack: error.stack || ""
});
```

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

var printTypeTable = PRICING_TABLE[genKey]
? PRICING_TABLE[genKey][printType]
: null;

if (!printTypeTable) {
return {
available: false,
materialsPrice: 0,
deliveryFee: 0,
total: 0,
message: "نوع الطباعة غير متاح لهذا الجيل."
};
}

var modelsTable = printTypeTable[modelsCount];

if (!modelsTable) {
return {
available: false,
materialsPrice: 0,
deliveryFee: 0,
total: 0,
message: "عدد النماذج غير متاح لهذا الاختيار."
};
}

var materialsPrice = 0;
var available = false;

if (genKey === "2008") {
var pricePerSubject = modelsTable[1];

```
if (pricePerSubject !== undefined) {
  materialsPrice = Number(pricePerSubject) * subjectsCount;
  available = true;
}
```

} else {
var price = modelsTable[subjectsCount];

```
if (price !== undefined) {
  materialsPrice = Number(price);
  available = true;
}
```

}

if (!available) {
return {
available: false,
materialsPrice: 0,
deliveryFee: 0,
total: 0,
message: "لا يوجد عرض متاح لهذا العدد من المواد."
};
}

var deliveryFee = 1;
var total = materialsPrice + deliveryFee;

return {
available: true,
materialsPrice: roundPrice(materialsPrice),
deliveryFee: roundPrice(deliveryFee),
total: roundPrice(total),
message: ""
};
}

function getGenerationKey(generation) {
var value = toText(generation);

if (value.indexOf("2009") !== -1) {
return "2009";
}

if (
value.indexOf("BTEC") !== -1 ||
value.indexOf("btec") !== -1 ||
value.indexOf("بيتيك") !== -1
) {
return "BTEC";
}

return "2008";
}

function roundPrice(value) {
return Math.round(Number(value || 0) * 100) / 100;
}

/* =========================
Subjects
========================= */

function getOrCreateSubjectsSheet() {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName("Subjects");

if (!sheet) {
sheet = ss.insertSheet("Subjects");

```
var headers = [
  "id",
  "name",
  "price",
  "description",
  "category",
  "status",
  "sortOrder",
  "createdAt",
  "updatedAt"
];

sheet.appendRow(headers);

var now = new Date();

var initialSubjects = [
  // 2009
  ["arabic-2009", "مادة لغة عربية", "", "", "2009", "active", 1, now, now],
  ["english-2009", "مادة إنجليزي", "", "", "2009", "active", 2, now, now],
  ["jordan-history-2009", "مادة تاريخ الأردن", "", "", "2009", "active", 3, now, now],
  ["islamic-2009", "مادة تربية إسلامية", "", "", "2009", "active", 4, now, now],

  // BTEC
  ["english-btec", "مادة إنجليزي", "", "", "BTEC", "active", 1, now, now],
  ["arabic-btec", "مادة لغة عربية", "", "", "BTEC", "active", 2, now, now],
  ["jordan-history-btec", "مادة تاريخ الأردن", "", "", "BTEC", "active", 3, now, now],
  ["islamic-btec", "مادة تربية إسلامية", "", "", "BTEC", "active", 4, now, now],

  // 2008
  ["financial-2008", "مادة ثقافة مالية", "", "التوصيل يوم الخميس 2/7", "2008", "active", 1, now, now],
  ["english-advanced-2008", "مادة إنجليزي متقدم 2008", "", "التوصيل يوم الأحد 5/7", "2008", "active", 2, now, now],
  ["physics-2008", "مادة فيزياء", "", "التوصيل يوم الثلاثاء 7/7", "2008", "active", 3, now, now],
  ["chemistry-2008", "مادة كيمياء", "", "التوصيل يوم الخميس 9/7", "2008", "active", 4, now, now],
  ["history-2008", "مادة تاريخ 2008", "", "التوصيل يوم الخميس 9/7", "2008", "active", 5, now, now],
  ["earth-science-2008", "مادة علوم الأرض", "", "التوصيل يوم الإثنين 13/7", "2008", "active", 6, now, now],
  ["philosophy-2008", "مادة فلسفة", "", "التوصيل يوم الإثنين 13/7", "2008", "active", 7, now, now],
  ["arabic-2008", "مادة لغة عربية 2008", "", "التوصيل يوم الأربعاء 15/7", "2008", "active", 8, now, now],
  ["biology-2008", "مادة علوم حياتية", "", "التوصيل يوم الخميس 16/7", "2008", "active", 9, now, now]
];

for (var i = 0; i < initialSubjects.length; i++) {
  sheet.appendRow(initialSubjects[i]);
}
```

}

return sheet;
}

function getSubjects() {
try {
var sheet = getOrCreateSubjectsSheet();
var lastRow = sheet.getLastRow();

```
if (lastRow <= 1) {
  return {
    success: true,
    subjects: []
  };
}

var values = sheet.getRange(2, 1, lastRow - 1, 9).getDisplayValues();
var subjects = [];

for (var i = 0; i < values.length; i++) {
  var row = values[i];
  var status = toText(row[5]) || "active";

  if (status !== "hidden") {
    subjects.push({
      id: toText(row[0]),
      name: toText(row[1]),
      price: toText(row[2]),
      description: toText(row[3]),
      category: toText(row[4]),
      status: status,
      sortOrder: parseInt(row[6], 10) || 99
    });
  }
}

subjects.sort(sortSubjects);

return {
  success: true,
  subjects: subjects
};
```

} catch (error) {
return {
success: false,
message: "فشل جلب المواد: " + error.toString(),
stack: error.stack || ""
};
}
}

function adminGetSubjects() {
try {
var sheet = getOrCreateSubjectsSheet();
var lastRow = sheet.getLastRow();

```
if (lastRow <= 1) {
  return {
    success: true,
    subjects: []
  };
}

var values = sheet.getRange(2, 1, lastRow - 1, 9).getDisplayValues();
var subjects = [];

for (var i = 0; i < values.length; i++) {
  var row = values[i];

  subjects.push({
    id: toText(row[0]),
    name: toText(row[1]),
    price: toText(row[2]),
    description: toText(row[3]),
    category: toText(row[4]),
    status: toText(row[5]) || "active",
    sortOrder: parseInt(row[6], 10) || 99,
    createdAt: toText(row[7]),
    updatedAt: toText(row[8])
  });
}

subjects.sort(sortSubjects);

return {
  success: true,
  subjects: subjects
};
```

} catch (error) {
return {
success: false,
message: "فشل جلب مواد الإدارة: " + error.toString(),
stack: error.stack || ""
};
}
}

function adminSaveSubject(sub) {
var lock = LockService.getScriptLock();

try {
lock.waitLock(30000);
} catch (e) {
return {
success: false,
message: "السيرفر مشغول، يرجى المحاولة مرة أخرى."
};
}

try {
sub = sub || {};

```
if (!toText(sub.name)) {
  return {
    success: false,
    message: "يرجى إدخال اسم المادة."
  };
}

var sheet = getOrCreateSubjectsSheet();
var lastRow = sheet.getLastRow();
var subId = toText(sub.id);

if (!subId) {
  subId = "sub-" + Math.random().toString(36).substring(2, 9) + "-" + new Date().getTime();
}

var values = lastRow > 1
  ? sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues()
  : [];

var rowIndex = -1;

for (var i = 0; i < values.length; i++) {
  if (toText(values[i][0]) === subId) {
    rowIndex = i + 2;
    break;
  }
}

var now = new Date();

var rowData = [
  subId,
  toText(sub.name),
  toText(sub.price),
  toText(sub.description),
  toText(sub.category) || "2008",
  toText(sub.status) || "active",
  parseInt(sub.sortOrder, 10) || 99,
  rowIndex !== -1 ? sheet.getRange(rowIndex, 8).getValue() : now,
  now
];

if (rowIndex !== -1) {
  sheet.getRange(rowIndex, 1, 1, 9).setValues([rowData]);
} else {
  sheet.appendRow(rowData);
}

return {
  success: true,
  message: "تم حفظ المادة بنجاح",
  subject: {
    id: subId
  }
};
```

} catch (error) {
return {
success: false,
message: "فشل حفظ المادة: " + error.toString(),
stack: error.stack || ""
};
} finally {
try {
lock.releaseLock();
} catch (err) {}
}
}

function adminDeleteSubject(id) {
var lock = LockService.getScriptLock();

try {
lock.waitLock(30000);
} catch (e) {
return {
success: false,
message: "السيرفر مشغول."
};
}

try {
var subjectId = toText(id);

```
if (!subjectId) {
  return {
    success: false,
    message: "معرّف المادة مطلوب."
  };
}

var sheet = getOrCreateSubjectsSheet();
var lastRow = sheet.getLastRow();

if (lastRow <= 1) {
  return {
    success: false,
    message: "لا يوجد مواد لحذفها."
  };
}

var values = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
var rowIndex = -1;

for (var i = 0; i < values.length; i++) {
  if (toText(values[i][0]) === subjectId) {
    rowIndex = i + 2;
    break;
  }
}

if (rowIndex === -1) {
  return {
    success: false,
    message: "المادة غير موجودة."
  };
}

sheet.getRange(rowIndex, 6).setValue("hidden");
sheet.getRange(rowIndex, 9).setValue(new Date());

return {
  success: true,
  message: "تم إخفاء المادة بنجاح."
};
```

} catch (error) {
return {
success: false,
message: "فشل إخفاء المادة: " + error.toString(),
stack: error.stack || ""
};
} finally {
try {
lock.releaseLock();
} catch (err) {}
}
}

function sortSubjects(a, b) {
var catOrder = {
"2009": 1,
"BTEC": 2,
"2008": 3,
"closed": 4
};

var orderA = catOrder[a.category] || 99;
var orderB = catOrder[b.category] || 99;

if (orderA !== orderB) {
return orderA - orderB;
}

return (a.sortOrder || 99) - (b.sortOrder || 99);
}

/* =========================
Orders
========================= */

function getOrderHeaders() {
return [
"التاريخ والوقت",
"رقم الطلب",
"الاسم الكامل",
"الصف / الجيل",
"المحافظة",
"المنطقة / العنوان التفصيلي",
"رقم موبايل للتواصل",
"رقم واتساب للتواصل",
"رقم هاتف آخر",
"المواد المطلوبة",
"مواد أخرى",
"سعر بكج المادة",
"تأكيد سعر التوصيل",
"ملاحظات أخرى",
"نوع الطباعة",
"عدد النماذج لكل مادة",
"سعر المواد",
"سعر التوصيل",
"الإجمالي الكلي",
"الحالة",
"آخر تعديل",
"عدد مرات التعديل"
];
}

function getOrCreateOrdersSheet() {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName("Orders");
var headers = getOrderHeaders();

if (!sheet) {
sheet = ss.insertSheet("Orders");
sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
sheet.setFrozenRows(1);
} else {
var currentCols = sheet.getLastColumn();

```
if (currentCols < headers.length) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}
```

}

formatPhoneColumnsAsText(sheet);

return sheet;
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

```
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
```

} catch (error) {
console.error("Error in submitOrder:", error);

```
return {
  success: false,
  message: "فشل حفظ الطلب في جدول البيانات: " + error.toString(),
  stack: error.stack || ""
};
```

} finally {
try {
lock.releaseLock();
} catch (err) {}
}
}

function findOrder(data) {
try {
data = data || {};

```
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
```

} catch (error) {
console.error("Error in findOrder:", error);

```
return {
  success: false,
  message: "حدث خطأ أثناء البحث عن الطلب: " + error.toString(),
  stack: error.stack || ""
};
```

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

```
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
```

} catch (error) {
console.error("Error in updateOrder:", error);

```
return {
  success: false,
  message: "فشل تحديث الطلب في جدول البيانات: " + error.toString(),
  stack: error.stack || ""
};
```

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
