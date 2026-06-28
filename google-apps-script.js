// Google Apps Script for Tawjihi Exam Order System (Netlify & CORS Safe)
// Version 3.0.0 - Supports submitOrder, findOrder, updateOrder

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
    
    // Return JSON response with CORS headers (for safety)
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
      data.fullName,                        // الاسم الكامل
      data.grade,                           // الصف / الجيل
      data.governorate,                     // المحافظة
      data.address,                         // المنطقة / العنوان التفصيلي
      data.phone,                           // رقم موبايل للتواصل
      data.whatsapp,                        // رقم واتساب للتواصل
      data.altPhone,                        // رقم هاتف آخر
      subjectsStr,                          // المواد المطلوبة
      data.otherSubjects || "",             // مواد أخرى
      data.packagePrice,                    // سعر بكج المادة
      data.deliveryConfirm,                 // تأكيد سعر التوصيل
      data.notes || "",                     // ملاحظات أخرى
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
          // Found matching order
          return {
            success: true,
            order: {
              fullName: row[2],
              grade: row[3],
              governorate: row[4],
              address: row[5],
              phone: row[6],
              whatsapp: row[7],
              altPhone: row[8],
              subjects: row[9] ? row[9].split(", ") : [],
              otherSubjects: row[10] || "",
              packagePrice: row[11],
              deliveryConfirm: row[12],
              notes: row[13] || ""
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
    
    // Find the row index (1-based for Sheet, loop is 0-based)
    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      var rowOrderId = row[1].toString().trim().toUpperCase();
      
      if (rowOrderId === orderNumber) {
        var rowPhone = normalizePhone(row[6]);
        var rowWhatsapp = normalizePhone(row[7]);
        var rowAltPhone = normalizePhone(row[8]);
        
        if (phoneInput === rowPhone || phoneInput === rowWhatsapp || phoneInput === rowAltPhone) {
          rowIndex = i + 2; // +2 because array is 0-indexed and rows start at 2
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
    
    var timestamp = new Date();
    var subjectsStr = Array.isArray(data.subjects) ? data.subjects.join(", ") : "";
    
    // Update specific cells in that row
    // Columns to update:
    // Col 3: الاسم الكامل
    sheet.getRange(rowIndex, 3).setValue(data.fullName);
    // Col 4: الصف / الجيل
    sheet.getRange(rowIndex, 4).setValue(data.grade);
    // Col 5: المحافظة
    sheet.getRange(rowIndex, 5).setValue(data.governorate);
    // Col 6: المنطقة / العنوان التفصيلي
    sheet.getRange(rowIndex, 6).setValue(data.address);
    // Col 7: رقم موبايل للتواصل
    sheet.getRange(rowIndex, 7).setValue(data.phone);
    // Col 8: رقم واتساب للتواصل
    sheet.getRange(rowIndex, 8).setValue(data.whatsapp);
    // Col 9: رقم هاتف آخر
    sheet.getRange(rowIndex, 9).setValue(data.altPhone);
    // Col 10: المواد المطلوبة
    sheet.getRange(rowIndex, 10).setValue(subjectsStr);
    // Col 11: مواد أخرى
    sheet.getRange(rowIndex, 11).setValue(data.otherSubjects || "");
    // Col 12: سعر بكج المادة
    sheet.getRange(rowIndex, 12).setValue(data.packagePrice);
    // Col 13: تأكيد سعر التوصيل
    sheet.getRange(rowIndex, 13).setValue(data.deliveryConfirm);
    // Col 14: ملاحظات أخرى
    sheet.getRange(rowIndex, 14).setValue(data.notes || "");
    
    // Col 15: الحالة -> تم التعديل
    sheet.getRange(rowIndex, 15).setValue("تم التعديل");
    // Col 16: آخر تعديل -> التاريخ والوقت الحالي
    sheet.getRange(rowIndex, 16).setValue(timestamp);
    // Col 17: عدد مرات التعديل -> increment
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

// دالة توحيد أرقام الهاتف (Normalize Phone Number)
// تحذف أي رموز غير أرقام، وتزيل البادئات مثل +962 أو 00962 أو الصفر الأول لترجع 9 خانات
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
