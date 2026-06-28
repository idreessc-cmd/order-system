// Google Apps Script for Tawjihi Exam Order System (Netlify & CORS Safe)
// Version 3.2.0 - Adds Dynamic Pricing Calculations & New Columns for Sheets

function doPost(e) {
  try {
    // Parse the incoming JSON data
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    
    var response;
    
    if (action === "submitOrder") {
      response = submitOrder(payload);
    } else if (action === "findOrder") {
      response = findOrder(payload);
    } else if (action === "updateOrder") {
      response = updateOrder(payload);
    } else {
      response = { success: false, message: "إجراء غير معروف (Unknown action)" };
    }
    
    // Return JSON response with CORS headers
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

// 1. تسجيل طلب جديد (Submit New Order)
function submitOrder(data) {
  var lock = LockService.getScriptLock();
  try {
    // Wait up to 30 seconds for the lock to handle concurrent requests safely
    lock.waitLock(30000); 
  } catch (e) {
    return { success: false, message: "السيرفر مشغول حالياً بطلبات أخرى. يرجى إعادة المحاولة خلال ثوانٍ." };
  }
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Orders");
    
    // Create sheet and write headers if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet("Orders");
      var headers = [
        "التاريخ والوقت", "رقم الطلب", "الاسم الكامل", "الصف / الجيل", 
        "المحافظة", "المنطقة / العنوان التفصيلي", "رقم موبايل للتواصل", 
        "رقم واتساب للتواصل", "رقم هاتف آخر", "المواد المطلوبة", 
        "مواد أخرى", "سعر بكج المادة", "تأكيد سعر التوصيل", 
        "ملاحظات أخرى", 
        "تفصيل الأسعار", "مجموع المواد", "سعر التوصيل", "الإجمالي الكلي", // أعمدة جديدة
        "الحالة", "آخر تعديل", "عدد مرات التعديل"
      ];
      sheet.appendRow(headers);
    }
    
    // Ensure phone columns are formatted as text to preserve leading zeros
    formatPhoneColumnsAsText(sheet);
    
    // Generate sequential Order ID using PropertiesService
    var props = PropertiesService.getScriptProperties();
    var lastNumStr = props.getProperty("LAST_ORDER_NUMBER");
    var lastNum = 100000; // Default start value
    
    if (lastNumStr) {
      lastNum = parseInt(lastNumStr, 10);
    } else {
      // Backup check: If property is empty, check the last row ID in the sheet
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
    
    // Calculate prices on server side
    var prices = calculateOrderTotal(
      toText(data.generation), 
      data.subjects || [], 
      toText(data.otherSubject), 
      toText(data.packagePrice)
    );
    
    var rowData = [
      timestamp,                            // التاريخ والوقت
      orderId,                              // رقم الطلب
      toText(data.fullName),                // الاسم الكامل
      toText(data.generation),              // الصف / الجيل
      toText(data.governorate),             // المحافظة
      toText(data.address),                 // المنطقة / العنوان التفصيلي
      phoneAsText(data.mobilePhone),        // رقم موبايل للتواصل
      phoneAsText(data.whatsappPhone),      // رقم واتساب للتواصل
      phoneAsText(data.otherPhone),         // رقم هاتف آخر
      subjectsStr,                          // المواد المطلوبة
      toText(data.otherSubject),            // مواد أخرى
      toText(data.packagePrice),            // سعر بكج المادة
      toText(data.deliveryConfirm),         // تأكيد سعر التوصيل
      toText(data.notes),                   // ملاحظات أخرى
      prices.priceDetails,                  // تفصيل الأسعار
      prices.subtotal,                      // مجموع المواد
      prices.deliveryFee,                   // سعر التوصيل
      prices.total,                         // الإجمالي الكلي
      "جديد",                               // الحالة
      "",                                   // آخر تعديل
      0                                     // عدد مرات التعديل
    ];
    
    sheet.appendRow(rowData);
    
    return {
      success: true,
      orderNumber: orderId,
      total: prices.total
    };
    
  } catch (error) {
    console.error("Error in submitOrder:", error);
    return { success: false, message: "فشل حفظ الطلب في جدول البيانات: " + error.toString() };
  } finally {
    lock.releaseLock();
  }
}

// 2. البحث عن طلب سابق (Find Order)
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
    
    // Fetch all records
    var range = sheet.getRange(2, 1, lastRow - 1, 21); // 21 columns in v3.2.0
    var values = range.getValues();
    
    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      var rowOrderId = row[1].toString().trim().toUpperCase();
      
      if (rowOrderId === orderNumber) {
        var rowPhone = normalizePhone(row[6]);
        var rowWhatsapp = normalizePhone(row[7]);
        var rowAltPhone = normalizePhone(row[8]);
        
        if (phoneInput === rowPhone || phoneInput === rowWhatsapp || phoneInput === rowAltPhone) {
          // Found matching order
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
              notes: toText(row[13])
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

// 3. تعديل طلب سابق (Update Order)
function updateOrder(data) {
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
    
    var orderNumber = data.orderNumber.toString().trim().toUpperCase();
    var phoneInput = normalizePhone(data.phone);
    
    var range = sheet.getRange(2, 1, lastRow - 1, 21); // 21 columns
    var values = range.getValues();
    var rowIndex = -1;
    var currentEditCount = 0;
    
    // Find the row index
    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      var rowOrderId = row[1].toString().trim().toUpperCase();
      
      if (rowOrderId === orderNumber) {
        var rowPhone = normalizePhone(row[6]);
        var rowWhatsapp = normalizePhone(row[7]);
        var rowAltPhone = normalizePhone(row[8]);
        
        if (phoneInput === rowPhone || phoneInput === rowWhatsapp || phoneInput === rowAltPhone) {
          rowIndex = i + 2; 
          currentEditCount = parseInt(row[20], 10) || 0; // Column 21 is edit count (index 20)
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
    
    // Ensure phone columns are formatted as text
    formatPhoneColumnsAsText(sheet);
    
    var timestamp = new Date();
    var subjectsStr = Array.isArray(data.subjects) ? data.subjects.join(", ") : "";
    
    // Calculate new prices on server side
    var prices = calculateOrderTotal(
      toText(data.generation), 
      data.subjects || [], 
      toText(data.otherSubject), 
      toText(data.packagePrice)
    );
    
    // Update cells in the row
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
    
    // Columns 15, 16, 17, 18 for prices
    sheet.getRange(rowIndex, 15).setValue(prices.priceDetails);
    sheet.getRange(rowIndex, 16).setValue(prices.subtotal);
    sheet.getRange(rowIndex, 17).setValue(prices.deliveryFee);
    sheet.getRange(rowIndex, 18).setValue(prices.total);
    
    // Status, Edit Time, Edit Count
    sheet.getRange(rowIndex, 19).setValue("تم التعديل");
    sheet.getRange(rowIndex, 20).setValue(timestamp);
    sheet.getRange(rowIndex, 21).setValue(currentEditCount + 1);
    
    return {
      success: true,
      orderNumber: orderNumber,
      total: prices.total,
      message: "تم تعديل طلبكم بنجاح"
    };
    
  } catch (error) {
    console.error("Error in updateOrder:", error);
    return { success: false, message: "فشل تحديث الطلب في جدول البيانات: " + error.toString() };
  } finally {
    lock.releaseLock();
  }
}

// دالة حساب السعر الكلي من جهة السيرفر لضمان الأمان والثبات
function calculateOrderTotal(generation, subjects, otherSubject, packagePriceVal) {
  var priceDetails = [];
  var subtotal = 0;
  
  if (Array.isArray(subjects)) {
    for (var i = 0; i < subjects.length; i++) {
      var subject = subjects[i];
      var price = getSubjectPrice(generation, subject, packagePriceVal);
      subtotal += price;
      priceDetails.push(subject + " = " + price + " JD");
    }
  }
  
  if (otherSubject && otherSubject.trim()) {
    var otherPrice = 0;
    if (generation === "توجيهي 2009") {
      otherPrice = getSubjectPrice(generation, "أخرى", packagePriceVal);
    } else if (generation === "بيتيك BTEC") {
      otherPrice = 3.5;
    } else { // توجيهي 2008
      otherPrice = 4.0; // السعر الافتراضي للمادة الإضافية الأخرى
    }
    subtotal += otherPrice;
    priceDetails.push("مواد أخرى (" + otherSubject.trim() + ") = " + otherPrice + " JD");
  }
  
  var deliveryFee = 1.0; // التوصيل دينار واحد
  var total = subtotal + deliveryFee;
  
  return {
    priceDetails: priceDetails.join(" | "),
    subtotal: subtotal,
    deliveryFee: deliveryFee,
    total: total
  };
}

// دالة استخراج سعر المادة حسب الجيل واسم المادة
function getSubjectPrice(generation, subjectName, packagePriceVal) {
  var name = subjectName.toLowerCase();
  
  if (generation === "بيتيك BTEC") {
    return 3.5;
  }
  
  if (generation === "توجيهي 2008") {
    if (name.indexOf("رياضيات") !== -1) return 4.5;
    if (name.indexOf("ثقافة مالية") !== -1) return 4.0;
    if (name.indexOf("كيمياء") !== -1) return 4.5;
    if (name.indexOf("علوم حياتية") !== -1) return 4.5;
    if (name.indexOf("علوم الأرض") !== -1 || name.indexOf("علوم أرض") !== -1 || name.indexOf("علوم ارض") !== -1) return 3.5;
    if (name.indexOf("فلسفة") !== -1) return 4.5;
    if (name.indexOf("فيزياء") !== -1) return 4.0;
    if (name.indexOf("تاريخ") !== -1) return 3.5;
    if (name.indexOf("لغة عربية") !== -1 || name.indexOf("عربي") !== -1) return 4.0;
    if (name.indexOf("إنجليزي") !== -1 || name.indexOf("إنجليزي") !== -1 || name.indexOf("انجليزي") !== -1) return 4.0;
    // أي مادة أخرى (مثل التربية الإسلامية) في 2008
    return 3.5;
  }
  
  if (generation === "توجيهي 2009") {
    // 2009 يعتمد على اختيار البكج أبيض وأسود أو ملون
    if (packagePriceVal && packagePriceVal.indexOf("2.5") !== -1) {
      return 2.5;
    }
    return 3.5;
  }
  
  return 3.5; // قيمة افتراضية احتياطية
}

// دالة تنسيق أعمدة الهواتف كأعمدة نصية
function formatPhoneColumnsAsText(sheet) {
  sheet.getRange("G:G").setNumberFormat("@");
  sheet.getRange("H:H").setNumberFormat("@");
  sheet.getRange("I:I").setNumberFormat("@");
}

// دالة للتأكد من حفظ الهاتف كنص
function phoneAsText(value) {
  if (value === null || value === undefined) return "";
  var text = value.toString().trim().replace(/^'/, "");
  return text ? "'" + text : "";
}

// دالة تحويل أي قيمة لنص نظيف
function toText(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/^'/, "").trim();
}

// دالة توحيد أرقام الهاتف للبحث والمطابقة
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
