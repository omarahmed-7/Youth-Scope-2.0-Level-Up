/**
 * ============================================================
 *  YouthScope - Registration Backend (Google Apps Script)
 * ============================================================
 *  Paste this code inside: Google Sheet > Extensions > Apps Script
 * ============================================================
 */

const SHEET_NAME = "Registrations";
const WORKSHOPS_SHEET_NAME = "WorkshopBookings";
const WORKSHOP_CAPACITY = 50;

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

    // Route to group registration (Group of 3 / Group of 5 ticket forms)
    if (data.action === "group_register") {
      return handleGroupRegister(data.attendees, data.groupSize);
    }

    // Route to workshop booking (Book Now popup on the Workshops page)
    if (data.action === "workshop_register") {
      return handleWorkshopRegister(data);
    }

    // Otherwise: normal single-person registration (Solo ticket form)
    if (!data.fullName || !data.email || !data.phone) {
      return jsonResponse({ status: "error", message: "Missing required fields" });
    }

    const ticketId = registerAttendee(data, "", 1);
    return jsonResponse({ status: "success", ticketId: ticketId });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

/**
 * Handles GET requests. Used by the Workshops page to read how many
 * seats are already booked per workshop, so it can grey out the
 * "Book Now" button and show "Fully Booked" once a room hits capacity.
 */
function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === "workshop_counts") {
      return jsonResponse({ status: "success", counts: getWorkshopCounts() });
    }

    return jsonResponse({ status: "error", message: "Unknown action" });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

/**
 * Handles a Group of 3 / Group of 5 submission: registers every attendee
 * under a shared Group ID, and sends each person their own individual
 * confirmation email with their own QR code.
 */
function handleGroupRegister(attendees, groupSize) {
  if (!attendees || !attendees.length) {
    return jsonResponse({ status: "error", message: "No attendees provided" });
  }

  const groupId = "GRP-" + Utilities.getUuid().split("-")[0].toUpperCase();
  const ticketIds = [];

  for (let i = 0; i < attendees.length; i++) {
    const person = attendees[i];
    if (!person.fullName || !person.email || !person.phone) {
      return jsonResponse({
        status: "error",
        message: "Missing required fields for person " + (i + 1),
      });
    }
    const ticketId = registerAttendee(person, groupId, groupSize);
    ticketIds.push(ticketId);
  }

  return jsonResponse({ status: "success", groupId: groupId, ticketIds: ticketIds });
}

/**
 * Registers a single attendee: saves their row in the Sheet, generates
 * their QR code, and emails them their ticket. Used by both solo and
 * group registrations.
 */
function registerAttendee(person, groupId, groupSize) {
  const ticketId = "YS-" + Utilities.getUuid().split("-")[0].toUpperCase();
  const timestamp = new Date();

  const sheet = getOrCreateSheet();
  sheet.appendRow([
    timestamp,
    person.fullName,
    person.email,
    person.phone,
    person.gender,
    person.age,
    person.governorate,
    person.university,
    person.faculty,
    person.major,
    person.academicYear,
    ticketId,
    "❌", // Check-in status - defaults to not checked in
    groupId || "",
    groupSize || 1,
  ]);

  // Generate the QR code image (contains ticket ID + name)
  const qrContent = encodeURIComponent(
    JSON.stringify({ ticketId: ticketId, name: person.fullName })
  );
  const qrUrl =
    "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" +
    qrContent;
  const qrBlob = UrlFetchApp.fetch(qrUrl).getBlob().setName("qrcode.png");

  // Send this person their own confirmation email with their own QR code
  sendTicketEmail(person.fullName, person.email, ticketId, qrBlob);

  return ticketId;
}

/**
 * Handles a workshop booking from the "Book Now" popup on the
 * Workshops page. Enforces the 50-seat capacity per workshop using
 * a lock so two people booking the last seat at the same time can't
 * both get in, then emails the attendee their own workshop QR ticket.
 */
function handleWorkshopRegister(data) {
  const workshopId = data.workshopId;
  const workshopName = data.workshopName || workshopId;

  if (!workshopId || !data.fullName || !data.email || !data.phone) {
    return jsonResponse({ status: "error", message: "Missing required fields" });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    const sheet = getOrCreateWorkshopSheet();
    const values = sheet.getDataRange().getValues();
    const WORKSHOP_ID_COL = 4; // column E (0-indexed) = "Workshop ID"

    let count = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i][WORKSHOP_ID_COL] === workshopId) count++;
    }

    if (count >= WORKSHOP_CAPACITY) {
      return jsonResponse({ status: "full", message: "This workshop is fully booked" });
    }

    const ticketId = "WKS-" + Utilities.getUuid().split("-")[0].toUpperCase();
    const timestamp = new Date();

    sheet.appendRow([
      timestamp,
      data.fullName,
      data.email,
      data.phone,
      workshopId,
      workshopName,
      ticketId,
      "❌", // Check-in status - defaults to not checked in
    ]);

    // Generate the QR code image (contains ticket ID + name + workshop)
    const qrContent = encodeURIComponent(
      JSON.stringify({ ticketId: ticketId, name: data.fullName, workshopId: workshopId })
    );
    const qrUrl =
      "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" +
      qrContent;
    const qrBlob = UrlFetchApp.fetch(qrUrl).getBlob().setName("qrcode.png");

    sendWorkshopTicketEmail(data.fullName, data.email, ticketId, workshopName, qrBlob);

    const newCount = count + 1;
    return jsonResponse({
      status: "success",
      ticketId: ticketId,
      full: newCount >= WORKSHOP_CAPACITY,
    });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.message });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Returns how many seats are booked for every workshop ID, e.g.
 * { "sales": 12, "ai-future": 50, ... } — used by the Workshops page
 * to grey out "Book Now" buttons for rooms that are already full.
 */
function getWorkshopCounts() {
  const sheet = getOrCreateWorkshopSheet();
  const values = sheet.getDataRange().getValues();
  const WORKSHOP_ID_COL = 4;

  const counts = {};
  for (let i = 1; i < values.length; i++) {
    const id = values[i][WORKSHOP_ID_COL];
    if (!id) continue;
    counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

function getOrCreateWorkshopSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(WORKSHOPS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(WORKSHOPS_SHEET_NAME);
    sheet.appendRow([
      "Timestamp",
      "Full Name",
      "Email",
      "Phone",
      "Workshop ID",
      "Workshop Name",
      "Ticket ID",
      "Check-in",
    ]);
  }
  return sheet;
}

function sendWorkshopTicketEmail(fullName, email, ticketId, workshopName, qrBlob) {
  const eventVenue = "Creativa Innovation Hub - Giza";
  const eventDate = "23/1/2027";

  const subject = "Your Workshop Seat is Confirmed - " + workshopName;

  const htmlBody =
    "<div style='background:#1c1c1c;padding:32px;font-family:Arial,sans-serif;color:#d8dae0;max-width:520px;margin:0 auto;border-radius:12px'>" +
      "<h2 style='color:#ffffff;margin-bottom:16px'>Hi " + fullName + "</h2>" +
      "<p style='line-height:1.6'>Your seat in <strong style='color:#ffffff'>" + workshopName + "</strong> has been successfully confirmed.</p>" +
      "<p style='line-height:1.6'>We're excited to have you with us.</p>" +

      "<h3 style='color:#ffffff;margin-top:28px;margin-bottom:10px'>Event details</h3>" +
      "<ul style='padding-left:18px;line-height:1.8;margin:0'>" +
        "<li><strong style='color:#ffffff'>Location:</strong> " + eventVenue + "</li>" +
        "<li><strong style='color:#ffffff'>Date:</strong> " + eventDate + "</li>" +
      "</ul>" +

      "<h3 style='color:#ffffff;margin-top:28px;margin-bottom:10px'>Your workshop access</h3>" +
      "<p style='line-height:1.6'>Please use the QR code below at the workshop room entrance.</p>" +
      "<p style='line-height:1.6'>Show it to the team member scanning at the door.</p>" +

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
    name: SENDER_DISPLAY_NAME,
    inlineImages: { qrImage: qrBlob },
  });
}

/**
 * Looks up a ticket ID in the sheet, marks it as checked in (✅),
 * and returns the attendee's info so the Scanner page can display it.
 * Checks the main event tickets first, then falls back to workshop
 * tickets, since both are scanned from the same Scanner page.
 */
function handleCheckIn(ticketId) {
  if (!ticketId) {
    return jsonResponse({ status: "error", message: "No ticket ID provided" });
  }

  const mainResult = checkInMainSheet(ticketId);
  if (mainResult) return jsonResponse(mainResult);

  const workshopResult = checkInWorkshopSheet(ticketId);
  if (workshopResult) return jsonResponse(workshopResult);

  // No matching ticket ID found in either sheet
  return jsonResponse({ status: "not_found", message: "This ticket is not registered" });
}

function checkInMainSheet(ticketId) {
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

      return {
        status: "success",
        alreadyCheckedIn: alreadyCheckedIn,
        ticketId: ticketId,
        fullName: values[i][FULLNAME_COL],
      };
    }
  }
  return null;
}

function checkInWorkshopSheet(ticketId) {
  const sheet = getOrCreateWorkshopSheet();
  const values = sheet.getDataRange().getValues();

  const TICKET_ID_COL = 6;    // column G (0-indexed) = "Ticket ID"
  const CHECKIN_COL = 7;      // column H (0-indexed) = "Check-in"
  const FULLNAME_COL = 1;     // column B (0-indexed) = "Full Name"
  const WORKSHOP_NAME_COL = 5; // column F (0-indexed) = "Workshop Name"

  for (let i = 1; i < values.length; i++) {
    if (values[i][TICKET_ID_COL] === ticketId) {
      const alreadyCheckedIn = values[i][CHECKIN_COL] === "✅";

      sheet.getRange(i + 1, CHECKIN_COL + 1).setValue("✅");

      return {
        status: "success",
        alreadyCheckedIn: alreadyCheckedIn,
        ticketId: ticketId,
        fullName: values[i][FULLNAME_COL],
        workshopName: values[i][WORKSHOP_NAME_COL],
      };
    }
  }
  return null;
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
      "Group ID",
      "Group Size",
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
