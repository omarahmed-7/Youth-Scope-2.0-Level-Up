# Level Up — Event Website

A multi-page static event website with a full ticketing, workshop-booking, and check-in system, backed by Google Sheets/Apps Script (no traditional database or server needed).

🔗 **Live site:** [youthscope20-level-up-youthscope.vercel.app](https://youthscope20-level-up-youthscope.vercel.app/)

## Features

### 🎟️ Ticketing & Registration
- Three ticket types: **Solo**, **Group of 3**, and **Group of 5**, each with its own registration form (`tickets.html`, `tickets-group3.html`, `tickets-group5.html`).
- Group registrations are linked under a shared **Group ID** while each member still gets their own individual ticket.
- On submit, the form posts to a Google Apps Script Web App (`Code.gs`), which:
  - Saves the attendee's data to a Google Sheet.
  - Generates a unique **Ticket ID** and a **QR code** (via the QR Server API).
  - Emails the attendee an HTML confirmation with their QR code embedded inline.
- Success/duplicate/error states are handled with an in-page modal instead of a page reload.

### 🛠️ Workshop Booking
- `workshops.html` lists workshops grouped by time slot, each with a **"Book Now"** button.
- Live seat availability is fetched on page load (`GET ?action=workshop_counts`), so buttons auto-grey out and show **"Fully Booked"** once a room hits its 50-seat capacity.
- Booking opens a modal form; submission is protected server-side with a **lock** (`LockService`) to prevent two users from grabbing the last seat at the same time.
- Each booked attendee gets their own workshop-specific QR ticket by email.

### 📷 Check-in Scanner
- `scanner.html` uses the device camera (`html5-qrcode`) to scan attendee QR codes at the door.
- Looks up the ticket in either the main registrations sheet or the workshop bookings sheet, marks it as checked in, and shows a clear success / already-checked-in / not-found result card.

### 🗓️ Agenda & Sponsors
- `agenda.html` renders a vertical alternating timeline of talks, speakers, and time slots.
- `sponsors.html` displays sponsors grouped into Platinum / Gold / Silver tiers with tiered card sizing.

### 🏠 Homepage
- Hero section with event info badges (date, venue) and a **live countdown timer** to the event date (`homescript.js`).
- "About the event" section with feature highlights (career exploration, networking, soft skills, fun zones).

### 📱 Shared UI
- Fully responsive across all pages (collapsible mobile nav menu, stacking grids, resized cards).
- Consistent header/footer, gradient theme, and modal/animation patterns (success checkmarks, pop-in transitions) reused across ticketing and workshops.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Google Apps Script (`Code.gs`) + Google Sheets as the data store
- **QR codes:** [QR Server API](https://goqr.me/api/)
- **QR scanning:** [html5-qrcode](https://github.com/mebjas/html5-qrcode)
- **Hosting:** [Vercel](https://vercel.com/)

## Project Structure

```
index.html                 Home page (hero, countdown, about)
agenda.html                Event agenda timeline
workshops.html             Workshop listing + booking
sponsors.html               Sponsors by tier
tickets.html                Solo ticket registration
tickets-group3.html         Group of 3 registration
tickets-group5.html         Group of 5 registration
scanner.html                Check-in QR scanner

homestyle.css / agendastyle.css / workshopsstyling.css
sponsorsstyle.css / ticketsstyle.css

homescript.js               Countdown timer logic
ticketsscript.js             Solo registration form logic
ticketsgroup3script.js       Group of 3 form logic
ticketsgroup5script.js       Group of 5 form logic
workshopsscript.js           Workshop booking + capacity logic

Code.gs                      Google Apps Script backend
                              (registration, workshop booking, check-in, emails)
```
