// Google Apps Script for Tawjihi Exam Order System (Netlify & CORS Safe)
// Version 4.1.0 - Implements Dynamic Pricing Matrix & Expanded Order Columns

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

function calculatePricing(generation, subjectsCount, printType, modelsCount) {
  if (!generation || subjectsCount <= 0 || !printType || !modelsCount) {
    return { available: false, materialsPrice: 0, deliveryFee: 0, total: 0 };
  }
  
  var genKey = generation.indexOf("2009") !== -1 ? "2009" : (generation.indexOf("BTEC") !== -1 || generation.indexOf("بيتيك") !== -1 ? "BTEC" : "2008");
  
  var printTypeTable = PRICING_TABLE[genKey] ? PRICING_TABLE[genKey][printType] : null;
  if (!printTypeTable) {
    return { available: false, materialsPrice: 0, deliveryFee: 0, total: 0 };
  }
  
  var modelsTable = printTypeTable[modelsCount];
  if (!modelsTable) {
    return { available: false, materialsPrice: 0, deliveryFee: 0, total: 0 };
  }
  
  var materialsPrice = 0;
  var available = false;
  
  if (genKey === "2008") {
    // 2008 special pricing: price is per subject, multiply by subjectsCount
    var pricePerSubject = modelsTable[1];
    if (pricePerSubject !== undefined) {
      materialsPrice = pricePerSubject * subjectsCount;
      available = true;
    }
  } else {
    // 2009 and BTEC: lookup exact subjectsCount
    var price = modelsTable[subjectsCount];
    if (price !== undefined) {
      materialsPrice = price;
      available = true;
    }
  }
  
  if (!available) {
    return { available: false, materialsPrice: 0, deliveryFee: 0, total: 0 };
  }
  
  var deliveryFee = 1.0;
  var total = materialsPrice + deliveryFee;
  
  return {
    available: true,
    materialsPrice: materialsPrice,
    deliveryFee: deliveryFee,
    total: total
  };
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    
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
      response = adminSaveSubject(payload.subject);
    } else if (action === "adminDeleteSubject") {
      response = adminDeleteSubject(payload.id);
    } else {
      response = { success: false, message: "إجراء غير معروف (Unknown action)" };
    }
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
      
  } catch (error) {
    console.error("Error in doPost:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "حدث خطأ في معالجة الطلب على خادم جوجل: " + error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");
  }
}

function getOrCreateSubjectsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Subjects");
  if (!sheet) {
    sheet = ss.insertSheet("Subjects");
    var headers = ["id", "name", "price", "description", "category", "status", "sortOrder", "createdAt", "updatedAt"];
    sheet.appendRow(headers);
    
    var initialSubjects = [
      // 2009
      ["arabic-2009", "امتحانات لغة عربية", 2.5, "", "2009", "active", 1, new Date(), new Date()],
      ["english-2009", "امتحانات إنجليزي", 2.5, "", "2009", "active", 2, new Date(), new Date()],
      ["jordan-history-2009", "امتحانات تاريخ الأردن", 2.5, "", "2009", "active", 3, new Date(), new Date()],
      ["islamic-2009", "امتحانات تربية إسلامية", 2.5, "", "2009", "active", 4, new Date(), new Date()],
      
      // 2008
      ["financial-2008", "ثقافة مالية", 4.0, "التوصيل يوم الخميس 2/7", "2008", "active", 5, new Date(), new Date()],
      ["english-advanced-2008", "إنجليزي متقدم 2008", 4.0, "التوصيل يوم الأحد 5/7", "2008", "active", 6, new Date(), new Date()],
      ["physics-2008", "فيزياء", 4.0, "التوصيل يوم الثلاثاء 7/7", "2008", "active", 7, new Date(), new Date()],
      ["chemistry-2008", "كيمياء", 4.5, "التوصيل يوم الخميس 9/7", "2008", "active", 8, new Date(), new Date()],
      ["history-2008", "تاريخ 2008", 3.5, "التوصيل يوم الخميس 9/7", "2008", "active", 9, new Date(), new Date()],
      ["earth-science-2008", "علوم الأرض", 3.5, "التوصيل يوم الإثنين 13/7", "2008", "active", 10, new Date(), new Date()],
      ["philosophy-2008", "فلسفة", 4.5, "التوصيل يوم الإثنين 13/7", "2008", "active", 11, new Date(), new Date()],
      ["arabic-2008", "لغة عربية 2008", 4.0, "التوصيل يوم الأربعاء 15/7", "2008", "active", 12, new Date(), new Date()],
      ["biology-2008", "علوم حياتية", 4.5, "التوصيل يوم الخميس 16/7", "2008", "active", 13, new Date(), new Date()],
      
      // BTEC
      ["english-btec", "إنجليزي", 3.5, "التوصيل يوم الأحد 5/7", "BTEC", "active", 14, new Date(), new Date()],
      ["arabic-btec", "لغة عربية", 3.5, "التوصيل يوم الثلاثاء 7/7", "BTEC", "active", 15, new Date(), new Date()],
      ["jordan-history-btec", "تاريخ الأردن", 3.5, "التوصيل يوم الأربعاء 15/7", "BTEC", "active", 16, new Date(), new Date()],
      ["islamic-btec", "تربية إسلامية", 3.5, "التوصيل يوم الجمعة 17/7", "BTEC", "active", 17, new Date(), new Date()],
      
      // Closed
      ["islamic-special-2008", "التربية الاسلامية تخصص", "", "انتهى موعد التقديم", "closed", "disabled", 18, new Date(), new Date()],
      ["geography", "الجغرافيا", "", "سيتم توفيرها داخل قروباتنا", "closed", "disabled", 19, new Date(), new Date()],
      ["business-math", "رياضيات الاعمال", "", "انتهى موعد التقديم", "closed", "disabled", 20, new Date(), new Date()],
      ["psychology", "علوم النفس والاجتماع", "", "انتهى موعد التقديم", "closed", "disabled", 21, new Date(), new Date()]
    ];
    
    for (var i = 0; i < initialSubjects.length; i++) {
      sheet.appendRow(initialSubjects[i]);
    }
  }
  return sheet;
}

function getSubjects() {
  try {
    var sheet = getOrCreateSubjectsSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true, subjects: [] };
    
    var values = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
    var subjects = [];
    
    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      var status = row[5].toString().trim();
      
      if (status !== "hidden") {
        subjects.push({
          id: row[0].toString(),
          name: row[1].toString(),
          price: row[2] ? parseFloat(row[2]) : null,
          description: row[3].toString(),
          category: row[4].toString(),
          status: status,
          sortOrder: parseInt(row[6], 10) || 99
        });
      }
    }
    
    subjects.sort(function(a, b) {
      var catOrder = { "2009": 1, "2008": 2, "BTEC": 3, "closed": 4 };
      var orderA = catOrder[a.category] || 99;
      var orderB = catOrder[b.category] || 99;
      
      if (orderA !== orderB) return orderA - orderB;
      return a.sortOrder - b.sortOrder;
    });
    
    return { success: true, subjects: subjects };
  } catch (error) {
    return { success: false, message: "فشل جلب المواد: " + error.toString() };
  }
}

function adminGetSubjects() {
  try {
    var sheet = getOrCreateSubjectsSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true, subjects: [] };
    
    var values = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
    var subjects = [];
    
    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      subjects.push({
        id: row[0].toString(),
        name: row[1].toString(),
        price: row[2] ? parseFloat(row[2]) : null,
        description: row[3].toString(),
        category: row[4].toString(),
        status: row[5].toString(),
        sortOrder: parseInt(row[6], 10) || 99,
        createdAt: row[7] ? row[7].toString() : "",
        updatedAt: row[8] ? row[8].toString() : ""
      });
    }
    
    subjects.sort(function(a, b) {
      var catOrder = { "2009": 1, "2008": 2, "BTEC": 3, "closed": 4 };
      var orderA = catOrder[a.category] || 99;
      var orderB = catOrder[b.category] || 99;
      
      if (orderA !== orderB) return orderA - orderB;
      return a.sortOrder - b.sortOrder;
    });
    
    return { success: true, subjects: subjects };
  } catch (error) {
    return { success: false, message: "فشل جلب مواد الإدارة: " + error.toString() };
  }
}

function adminSaveSubject(sub) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    return { success: false, message: "السيرفر مشغول، يرجى المحاولة مرة أخرى." };
  }
  
  try {
    var sheet = getOrCreateSubjectsSheet();
    var lastRow = sheet.getLastRow();
    var subId = sub.id ? sub.id.toString().trim() : "";
    
    if (!subId) {
      subId = "sub-" + Math.random().toString(36).substring(2, 9) + "-" + new Date().getTime();
    }
    
    var values = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 1).getValues() : [];
    var rowIndex = -1;
    
    for (var i = 0; i < values.length; i++) {
      if (values[i][0].toString() === subId) {
        rowIndex = i + 2;
        break;
      }
    }
    
    var now = new Date();
    var priceVal = sub.price !== "" && sub.price !== null && sub.price !== undefined ? parseFloat(sub.price) : "";
    
    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 2).setValue(sub.name.toString());
      sheet.getRange(rowIndex, 3).setValue(priceVal);
      sheet.getRange(rowIndex, 4).setValue(sub.description ? sub.description.toString() : "");
      sheet.getRange(rowIndex, 5).setValue(sub.category.toString());
      sheet.getRange(rowIndex, 6).setValue(sub.status.toString());
      sheet.getRange(rowIndex, 7).setValue(parseInt(sub.sortOrder, 10) || 99);
      sheet.getRange(rowIndex, 9).setValue(now);
    } else {
      sheet.appendRow([
        subId,
        sub.name.toString(),
        priceVal,
        sub.description ? sub.description.toString() : "",
        sub.category.toString(),
        sub.status.toString(),
        parseInt(sub.sortOrder, 10) || 99,
        now,
        now
      ]);
    }
    
    return { success: true, message: "تم حفظ المادة بنجاح" };
  } catch (error) {
    return { success: false, message: "فشل حفظ المادة: " + error.toString() };
  } finally {
    lock.releaseLock();
  }
}

function adminDeleteSubject(id) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    return { success: false, message: "السيرفر مشغول." };
  }
  
  try {
    var sheet = getOrCreateSubjectsSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: false, message: "لا يوجد مواد لحذفها." };
    
    var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    var rowIndex = -1;
    
    for (var i = 0; i < values.length; i++) {
      if (values[i][0].toString() === id) {
        rowIndex = i + 2;
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, message: "المادة غير موجودة." };
    }
    
    sheet.getRange(rowIndex, 6).setValue("hidden");
    sheet.getRange(rowIndex, 9).setValue(new Date());
    
    return { success: true, message: "تم إخفاء المادة بنجاح." };
  } catch (error) {
    return { success: false, message: "فشل إخفاء المادة: " + error.toString() };
  } finally {
    lock.releaseLock();
  }
}

// 5. تسجيل طلب جديد (Submit New Order)
function submitOrder(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
  } catch (e) {
    return { success: false, message: "السيرفر مشغول حالياً بطلبات أخرى." };
  }
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Orders");
    
    var headers = [
      "التاريخ والوقت", "رقم الطلب", "الاسم الكامل", "الصف / الجيل", 
      "المحافظة", "المنطقة / العنوان التفصيلي", "رقم موبايل للتواصل", 
      "رقم واتساب للتواصل", "رقم هاتف آخر", "المواد المطلوبة", 
      "مواد أخرى", "سعر بكج المادة", "تأكيد سعر التوصيل", "ملاحظات أخرى",
      "نوع الطباعة", "عدد النماذج لكل مادة", "سعر المواد", "سعر التوصيل", "الإجمالي الكلي", // حقول تسعير جديدة
      "الحالة", "آخر تعديل", "عدد مرات التعديل"
    ];

    if (!sheet) {
      sheet = ss.insertSheet("Orders");
      sheet.appendRow(headers);
    } else if (sheet.getLastColumn() < 22) {
      // ترقية وتوسيع الشيت الحالي إلى 22 عموداً
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    formatPhoneColumnsAsText(sheet);
    
    var props = PropertiesService.getScriptProperties();
    var lastNumStr = props.getProperty("LAST_ORDER_NUMBER");
    var lastNum = 100000;
    
    if (lastNumStr) {
      lastNum = parseInt(lastNumStr, 10);
    } else {
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        var lastCellVal = sheet.getRange(lastRow, 2).getValue().toString();
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
    var subjectsStr = Array.isArray(data.subjects) ? data.subjects.join(", ") : "";
    var subjectsCount = Array.isArray(data.subjects) ? data.subjects.length : 0;
    
    // حساب التسعير من السيرفر لضمان الأمان
    var pricing = calculatePricing(
      toText(data.generation),
      subjectsCount,
      toText(data.printType),
      parseInt(data.modelsCount, 10) || 0
    );
    
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
      toText(data.packagePrice), // فارغ في النظام الجديد
      toText(data.deliveryConfirm),
      toText(data.notes),
      toText(data.printType),       // نوع الطباعة
      toText(data.modelsCount),     // عدد النماذج
      pricing.materialsPrice,       // سعر المواد
      pricing.deliveryFee,          // سعر التوصيل
      pricing.total,                // الإجمالي الكلي
      "جديد",
      "",
      0
    ];
    
    sheet.appendRow(rowData);
    
    return {
      success: true,
      orderNumber: orderId,
      pricing: {
        materialsPrice: pricing.materialsPrice,
        deliveryFee: pricing.deliveryFee,
        total: pricing.total
      }
    };
    
  } catch (error) {
    console.error("Error in submitOrder:", error);
    return { success: false, message: "فشل حفظ الطلب في جدول البيانات: " + error.toString() };
  } finally {
    lock.releaseLock();
  }
}

// 6. البحث عن طلب سابق (Find Order)
function findOrder(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Orders");
    
    if (!sheet) {
      return { success: false, message: "لا يوجد طلبات مسجلة في النظام بعد." };
    }
    
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { success: false, message: "لا يوجد طلبات مسجلة في النظام بعد." };
    }
    
    var orderNumber = data.orderNumber.toString().trim().toUpperCase();
    var phoneInput = normalizePhone(data.phone);
    
    var cols = sheet.getLastColumn();
    var range = sheet.getRange(2, 1, lastRow - 1, cols);
    var values = range.getValues();
    
    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      var rowOrderId = row[1].toString().trim().toUpperCase();
      
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
              printType: cols >= 15 ? toText(row[14]) : "",       // جلب نوع الطباعة
              modelsCount: cols >= 16 ? toText(row[15]) : ""       // جلب عدد النماذج
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
    return { success: false, message: "حدث خطأ أثناء البحث عن الطلب: " + error.toString() };
  }
}

// 7. تعديل طلب سابق (Update Order)
function updateOrder(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
  } catch (e) {
    return { success: false, message: "السيرفر مشغول حالياً، يرجى المحاولة مرة أخرى." };
  }
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Orders");
    
    if (!sheet) {
      return { success: false, message: "لا يمكن التحديث. الجدول غير موجود." };
    }
    
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { success: false, message: "لا يوجد طلبات لتحديثها." };
    }
    
    var orderNumber = payload.orderNumber.toString().trim().toUpperCase();
    var phoneInput = normalizePhone(payload.phone);
    var data = payload.data || {};
    
    var headers = [
      "التاريخ والوقت", "رقم الطلب", "الاسم الكامل", "الصف / الجيل", 
      "المحافظة", "المنطقة / العنوان التفصيلي", "رقم موبايل للتواصل", 
      "رقم واتساب للتواصل", "رقم هاتف آخر", "المواد المطلوبة", 
      "مواد أخرى", "سعر بكج المادة", "تأكيد سعر التوصيل", "ملاحظات أخرى",
      "نوع الطباعة", "عدد النماذج لكل مادة", "سعر المواد", "سعر التوصيل", "الإجمالي الكلي",
      "الحالة", "آخر تعديل", "عدد مرات التعديل"
    ];

    if (sheet.getLastColumn() < 22) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    var range = sheet.getRange(2, 1, lastRow - 1, 22);
    var values = range.getValues();
    var rowIndex = -1;
    var currentEditCount = 0;
    
    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      var rowOrderId = row[1].toString().trim().toUpperCase();
      
      if (rowOrderId === orderNumber) {
        var rowPhone = normalizePhone(row[6]);
        var rowWhatsapp = normalizePhone(row[7]);
        var rowAltPhone = normalizePhone(row[8]);
        
        if (phoneInput === rowPhone || phoneInput === rowWhatsapp || phoneInput === rowAltPhone) {
          rowIndex = i + 2; 
          currentEditCount = parseInt(row[21], 10) || 0; // index 21 is Column 22
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
    
    formatPhoneColumnsAsText(sheet);
    
    var timestamp = new Date();
    var subjectsStr = Array.isArray(data.subjects) ? data.subjects.join(", ") : "";
    var subjectsCount = Array.isArray(data.subjects) ? data.subjects.length : 0;
    
    // حساب التسعير المحدث من السيرفر
    var pricing = calculatePricing(
      toText(data.generation),
      subjectsCount,
      toText(data.printType),
      parseInt(data.modelsCount, 10) || 0
    );
    
    // تعديل بيانات الطلب في الجدول
    sheet.getRange(rowIndex, 3).setValue(toText(data.fullName));
    sheet.getRange(rowIndex, 4).setValue(toText(data.generation));
    sheet.getRange(rowIndex, 5).setValue(toText(data.governorate));
    sheet.getRange(rowIndex, 6).setValue(toText(data.address));
    sheet.getRange(rowIndex, 7).setValue(phoneAsText(data.mobilePhone));
    sheet.getRange(rowIndex, 8).setValue(phoneAsText(data.whatsappPhone));
    sheet.getRange(rowIndex, 9).setValue(phoneAsText(data.otherPhone));
    sheet.getRange(rowIndex, 10).setValue(subjectsStr);
    sheet.getRange(rowIndex, 11).setValue(toText(data.otherSubject));
    sheet.getRange(rowIndex, 12).setValue(toText(data.packagePrice));
    sheet.getRange(rowIndex, 13).setValue(toText(data.deliveryConfirm));
    sheet.getRange(rowIndex, 14).setValue(toText(data.notes));
    
    // حقول التسعير الجديدة (أعمدة 15، 16، 17، 18، 19)
    sheet.getRange(rowIndex, 15).setValue(toText(data.printType));
    sheet.getRange(rowIndex, 16).setValue(toText(data.modelsCount));
    sheet.getRange(rowIndex, 17).setValue(pricing.materialsPrice);
    sheet.getRange(rowIndex, 18).setValue(pricing.deliveryFee);
    sheet.getRange(rowIndex, 19).setValue(pricing.total);
    
    // الحالة وإحصاءات التعديل
    sheet.getRange(rowIndex, 20).setValue("تم التعديل");
    sheet.getRange(rowIndex, 21).setValue(timestamp);
    sheet.getRange(rowIndex, 22).setValue(currentEditCount + 1);
    
    return {
      success: true,
      orderNumber: orderNumber,
      pricing: {
        materialsPrice: pricing.materialsPrice,
        deliveryFee: pricing.deliveryFee,
        total: pricing.total
      },
      message: "تم تعديل طلبكم بنجاح"
    };
    
  } catch (error) {
    console.error("Error in updateOrder:", error);
    return { success: false, message: "فشل تحديث الطلب في جدول البيانات: " + error.toString() };
  } finally {
    lock.releaseLock();
  }
}

function formatPhoneColumnsAsText(sheet) {
  sheet.getRange("G:G").setNumberFormat("@");
  sheet.getRange("H:H").setNumberFormat("@");
  sheet.getRange("I:I").setNumberFormat("@");
}

function phoneAsText(value) {
  if (value === null || value === undefined) return "";
  var text = value.toString().trim().replace(/^'/, "");
  return text ? "'" + text : "";
}

function toText(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/^'/, "").trim();
}

function normalizePhone(phone) {
  if (!phone) return "";
  var digits = phone.toString().replace(/\D/g, '');
  
  if (digits.indexOf("00962") === 0) {
    digits = digits.substring(5);
  } else if (digits.indexOf("962") === 0) {
    digits = digits.substring(3);
  } else if (digits.indexOf("0") === 0) {
    digits = digits.substring(1);
  }
  
  return digits;
}
