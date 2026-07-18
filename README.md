# Youth Scope 2.0: Level Up — Website

This folder contains the full website, ready to upload to GitHub and deploy on Vercel.
**All images are included** — nothing else needs to be added.

## What was fixed in this pass

- **Navigation links now actually work.** Before, "Home / Agenda / Workshops / Sponsors /
  Tickets" in the header were plain text with no links. Now every page links to the others
  (`index.html`, `agenda.html`, `workshops.html`, `sponsors.html`, `tickets.html`).
- **Mobile menu (☰) added** to every page — on small screens the nav collapses into a
  hamburger button.
- **Responsive design added**: header, hero section, form, sponsor cards, and section titles
  now adjust properly on phone-sized screens.
- **Fixed broken HTML structure** in `sponsors.html` (the header was incorrectly placed
  outside the `<body>` tag) and `agenda.html` (had a duplicate closing tag and an unused
  script reference).
- **Renamed files** for consistency: the homepage is now `index.html` (required — this is
  the file that loads automatically when someone visits your site), and `tickets.html` /
  `agenda.html` / etc. are all lowercase to avoid case-sensitivity issues once hosted online.

## File structure

```
youthscope-website/
  index.html              → Home page
  agenda.html              → Event agenda (timeline)
  workshops.html           → Workshops (parallel tracks)
  sponsors.html            → Sponsors page
  tickets.html              → Registration form
  scanner.html               → QR check-in scanner (for your Registration team only)
  homestyle.css / homescript.js
  agendastyle.css
  workshopsstyling.css
  sponsorsstyle.css
  ticketsstyle.css / ticketsscript.js
  Code.gs                   → Google Apps Script backend (paste into your Google Sheet's
                               Apps Script editor — this is NOT part of the website files
                               themselves, it's the backend that receives form submissions)
```

## How to deploy

### 1) Upload to GitHub

1. Go to [github.com](https://github.com) and create a new repository (e.g. `youthscope-website`).
2. On the repository page, click **Add file → Upload files**.
3. Drag in every file from this folder (including your image files).
4. Commit the changes.

### 2) Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (you can sign in directly with GitHub).
2. Click **Add New → Project**.
3. Select the GitHub repository you just created.
4. Framework preset: choose **Other** (this is a static HTML site, no build step needed).
5. Click **Deploy**.
6. After a few seconds, Vercel gives you a live URL (e.g. `youthscope-website.vercel.app`) —
   your site is now live and accessible to anyone.

### 3) Test everything on the live link

- Click through all nav links (Home, Agenda, Workshops, Sponsors, Tickets).
- Submit the registration form with your own email and confirm you get the QR code email.
- Check the Google Sheet to confirm the row was added.
- Open `scanner.html` on a phone and test scanning a QR code from an email you received.

### Note on `scanner.html`

This page uses the camera, which only works over **HTTPS**. Once deployed on Vercel, the
URL will automatically be HTTPS, so this will work fine for your Registration team on the
event day — just share them the link, e.g. `https://your-site.vercel.app/scanner.html`.
