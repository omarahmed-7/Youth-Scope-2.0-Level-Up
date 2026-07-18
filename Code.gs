/**
 * ============================================================
 *  YouthScope - Registration Backend (Google Apps Script)
 * ============================================================
 *  Paste this code inside: Google Sheet > Extensions > Apps Script
 * ============================================================
 */

const SHEET_NAME = "Registrations";

// Display name shown in the email (the actual sender address will still
// be your Gmail account, unless you have Google Workspace on a custom domain)
const SENDER_DISPLAY_NAME = "YouthScope";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Route to check-in logic if this request is coming from the Scanner page
    if (data.action === "checkin") {
      return handleCheckIn(data.ticketId);
    }

    const fullName = data.fullName;
    const email = data.email;
    const phone = data.phone;
    const gender = data.gender;
    const age = data.age;
    const governorate = data.governorate;
    const university = data.university;
    const faculty = data.faculty;
    const major = data.major;
    const academicYear = data.academicYear;

    if (!fullName || !email || !phone) {
      return jsonResponse({ status: "error", message: "Missing required fields" });
    }

    // 1) Generate a unique ticket ID
    const ticketId = "YS-" + Utilities.getUuid().split("-")[0].toUpperCase();
    const timestamp = new Date();

    // 2) Save the data into the Google Sheet
    const sheet = getOrCreateSheet();
    sheet.appendRow([
      timestamp,
      fullName,
      email,
      phone,
      gender,
      age,
      governorate,
      university,
      faculty,
      major,
      academicYear,
      ticketId,
      "❌", // Check-in status - defaults to not checked in
    ]);

    // 3) Generate the QR code image (contains ticket ID + name)
    const qrContent = encodeURIComponent(
      JSON.stringify({ ticketId: ticketId, name: fullName })
    );
    const qrUrl =
      "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" +
      qrContent;
    const qrBlob = UrlFetchApp.fetch(qrUrl).getBlob().setName("qrcode.png");

    // 4) Send the confirmation email with the QR code attached inline
    sendTicketEmail(fullName, email, ticketId, qrBlob);

    return jsonResponse({ status: "success", ticketId: ticketId });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

/**
 * Looks up a ticket ID in the sheet, marks it as checked in (✅),
 * and returns the attendee's info so the Scanner page can display it.
 */
function handleCheckIn(ticketId) {
  if (!ticketId) {
    return jsonResponse({ status: "error", message: "No ticket ID provided" });
  }

  const sheet = getOrCreateSheet();
  const values = sheet.getDataRange().getValues();

  const TICKET_ID_COL = 11; // column L (0-indexed) = "Ticket ID"
  const CHECKIN_COL = 12;   // column M (0-indexed) = "Check-in"
  const FULLNAME_COL = 1;   // column B (0-indexed) = "Full Name"

  for (let i = 1; i < values.length; i++) {
    if (values[i][TICKET_ID_COL] === ticketId) {
      const alreadyCheckedIn = values[i][CHECKIN_COL] === "✅";

      // Mark as checked in (row i in the array = row i+1 in the actual sheet)
      sheet.getRange(i + 1, CHECKIN_COL + 1).setValue("✅");

      return jsonResponse({
        status: "success",
        alreadyCheckedIn: alreadyCheckedIn,
        ticketId: ticketId,
        fullName: values[i][FULLNAME_COL],
      });
    }
  }

  // No matching ticket ID found
  return jsonResponse({ status: "not_found", message: "This ticket is not registered" });
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "Timestamp",
      "Full Name",
      "Email",
      "Phone",
      "Gender",
      "Age",
      "Governorate",
      "University",
      "Faculty",
      "Major",
      "Academic Year",
      "Ticket ID",
      "Check-in",
    ]);
  }
  return sheet;
}

function sendTicketEmail(fullName, email, ticketId, qrBlob) {
  const eventName = "Youth Scope 2.0 - Level Up";
  const eventVenue = "Creativa Innovation Hub - Giza";
  const eventDate = "23/1/2027";

  const subject = "Your Ticket is Confirmed - " + eventName;

  const htmlBody =
    "<div style='background:#1c1c1c;padding:32px;font-family:Arial,sans-serif;color:#d8dae0;max-width:520px;margin:0 auto;border-radius:12px'>" +
      "<h2 style='color:#ffffff;margin-bottom:16px'>Hi " + fullName + "</h2>" +
      "<p style='line-height:1.6'>Your ticket for <strong style='color:#ffffff'>" + eventName + "</strong> has been successfully confirmed.</p>" +
      "<p style='line-height:1.6'>We're excited to have you with us.</p>" +

      "<h3 style='color:#ffffff;margin-top:28px;margin-bottom:10px'>Event details</h3>" +
      "<ul style='padding-left:18px;line-height:1.8;margin:0'>" +
        "<li><strong style='color:#ffffff'>Location:</strong> " + eventVenue + "</li>" +
        "<li><strong style='color:#ffffff'>Date:</strong> " + eventDate + "</li>" +
      "</ul>" +

      "<h3 style='color:#ffffff;margin-top:28px;margin-bottom:10px'>Your event access</h3>" +
      "<p style='line-height:1.6'>Please use the QR code below to access the event.</p>" +
      "<p style='line-height:1.6'>Show it at the entrance on the event day.</p>" +

      "<div style='text-align:center;margin:24px 0'>" +
        "<img src='cid:qrImage' width='230' height='230' style='border:6px solid #ffffff;border-radius:8px' />" +
      "</div>" +

      "<p style='line-height:1.6;margin-top:28px'>If you have any questions or need assistance, feel free to reach out.</p>" +
      "<p style='line-height:1.6;margin-top:20px'>Best regards,<br>" + SENDER_DISPLAY_NAME + " Team</p>" +
    "</div>";

  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: htmlBody,
    name: SENDER_DISPLAY_NAME, // display name only, not the actual sender address
    inlineImages: { qrImage: qrBlob },
  });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
