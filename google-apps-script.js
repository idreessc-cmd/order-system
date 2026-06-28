// Google Apps Script for Tawjihi Exam Order System (Netlify & CORS Safe)
// Version 3.1.0 - Adds Text formatting for phone numbers to prevent losing leading zeros

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
        "ملاحظات أخرى", "الحالة", "آخر تعديل", "عدد مرات التعديل"
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
    
    var rowData = [
      timestamp,                            // التاريخ والوقت
      orderId,                              // رقم الطلب
      toText(data.fullName),                // الاسم الكامل
      toText(data.generation),              // الصف / الجيل
      toText(data.governorate),             // المحافظة
      toText(data.address),                 // المنطقة / العنوان التفصيلي
      phoneAsText(data.mobilePhone),        // رقم موبايل للتواصل (صيغة نصية لحفظ الصفر)
      phoneAsText(data.whatsappPhone),      // رقم واتساب للتواصل (صيغة نصية لحفظ الصفر)
      phoneAsText(data.otherPhone),         // رقم هاتف آخر (صيغة نصية لحفظ الصفر)
      subjectsStr,                          // المواد المطلوبة
      toText(data.otherSubject),            // مواد أخرى
      toText(data.packagePrice),            // سعر بكج المادة
      toText(data.deliveryConfirm),         // تأكيد سعر التوصيل
      toText(data.notes),                   // ملاحظات أخرى
      "جديد",                               // الحالة
      "",                                   // آخر تعديل
      0                                     // عدد مرات التعديل
    ];
    
    sheet.appendRow(rowData);
    
    return {
      success: true,
      orderNumber: orderId
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
    var range = sheet.getRange(2, 1, lastRow - 1, 17);
    var values = range.getValues();
    
    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      var rowOrderId = row[1].toString().trim().toUpperCase();
      
      if (rowOrderId === orderNumber) {
        // Normalize all phone numbers in the row
        var rowPhone = normalizePhone(row[6]);
        var rowWhatsapp = normalizePhone(row[7]);
        var rowAltPhone = normalizePhone(row[8]);
        
        // Match phone input against any of the three columns
        if (phoneInput === rowPhone || phoneInput === rowWhatsapp || phoneInput === rowAltPhone) {
          // Found matching order - return all fields as explicit strings
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
    
    var range = sheet.getRange(2, 1, lastRow - 1, 17);
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
          currentEditCount = parseInt(row[16], 10) || 0;
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
    
    // Update specific cells in that row
    sheet.getRange(rowIndex, 3).setValue(toText(data.fullName));
    sheet.getRange(rowIndex, 4).setValue(toText(data.generation));
    sheet.getRange(rowIndex, 5).setValue(toText(data.governorate));
    sheet.getRange(rowIndex, 6).setValue(toText(data.address));
    sheet.getRange(rowIndex, 7).setValue(phoneAsText(data.mobilePhone)); // صيغة نصية لحفظ الصفر
    sheet.getRange(rowIndex, 8).setValue(phoneAsText(data.whatsappPhone)); // صيغة نصية لحفظ الصفر
    sheet.getRange(rowIndex, 9).setValue(phoneAsText(data.otherPhone)); // صيغة نصية لحفظ الصفر
    sheet.getRange(rowIndex, 10).setValue(subjectsStr);
    sheet.getRange(rowIndex, 11).setValue(toText(data.otherSubject));
    sheet.getRange(rowIndex, 12).setValue(toText(data.packagePrice));
    sheet.getRange(rowIndex, 13).setValue(toText(data.deliveryConfirm));
    sheet.getRange(rowIndex, 14).setValue(toText(data.notes));
    
    sheet.getRange(rowIndex, 15).setValue("تم التعديل");
    sheet.getRange(rowIndex, 16).setValue(timestamp);
    sheet.getRange(rowIndex, 17).setValue(currentEditCount + 1);
    
    return {
      success: true,
      orderNumber: orderNumber,
      message: "تم تعديل طلبكم بنجاح"
    };
    
  } catch (error) {
    console.error("Error in updateOrder:", error);
    return { success: false, message: "فشل تحديث الطلب في جدول البيانات: " + error.toString() };
  } finally {
    lock.releaseLock();
  }
}

// دالة تنسيق أعمدة الهواتف كأعمدة نصية لمنع فقدان الصفر البادئ
function formatPhoneColumnsAsText(sheet) {
  sheet.getRange("G:G").setNumberFormat("@");
  sheet.getRange("H:H").setNumberFormat("@");
  sheet.getRange("I:I").setNumberFormat("@");
}

// دالة للتأكد من حفظ الهاتف كنص وإجبار جوجل شيتس على عدم تحويله لرقم (بإضافة علامة الكوتيشن المفردة الصامتة)
function phoneAsText(value) {
  if (value === null || value === undefined) return "";
  var text = value.toString().trim().replace(/^'/, ""); // إزالة الكوتيشن إن وجدت لتفادي التكرار
  return text ? "'" + text : "";
}

// دالة تحويل أي قيمة لنص نظيف مع إزالة أي علامات كوتيشن مفردة صامتة مضافة
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
