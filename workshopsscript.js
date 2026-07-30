const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby7DQYqBxAnoMZLYsb5z-ifzgDTz_P3p891oELC2KJZ_JwYMS5E3E3y2B0TJ9Dje98r/exec";
const WORKSHOP_CAPACITY = 50;

const bookButtons = document.querySelectorAll(".workshop-book-btn");

const workshopModal = document.getElementById("workshopModal");
const workshopModalClose = document.getElementById("workshopModalClose");
const workshopModalTitle = document.getElementById("workshopModalTitle");
const workshopModalSubtitle = document.getElementById("workshopModalSubtitle");
const workshopForm = document.getElementById("workshopBookingForm");
const wsFullName = document.getElementById("wsFullName");
const wsEmail = document.getElementById("wsEmail");
const wsPhone = document.getElementById("wsPhone");
const wsSubmitBtn = document.getElementById("wsSubmitBtn");

const successModal = document.getElementById("workshopSuccessModal");
const wsCloseSuccessBtn = document.getElementById("wsCloseSuccessBtn");

let activeWorkshopId = null;
let activeWorkshopName = null;
let activeWorkshopPlace = null;
let activeButton = null;

function markFullyBooked(button) {
  button.textContent = "Fully Booked";
  button.disabled = true;
  button.classList.add("fully-booked");
}

// Load current booking counts on page load so full workshops start locked
async function loadWorkshopCounts() {
  try {
    const response = await fetch(SCRIPT_URL + "?action=workshop_counts");
    const result = await response.json();
    if (result.status === "success" && result.counts) {
      bookButtons.forEach((btn) => {
        const id = btn.dataset.workshopId;
        const count = result.counts[id] || 0;
        if (count >= WORKSHOP_CAPACITY) {
          markFullyBooked(btn);
        }
      });
    }
  } catch (err) {
    // If the counts can't be fetched, leave buttons as-is;
    // the server will still enforce the capacity on submit.
  }
}

bookButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.disabled) return;

    activeWorkshopId = btn.dataset.workshopId;
    activeWorkshopName = btn.dataset.workshopName;
    activeWorkshopPlace = btn.dataset.workshopPlace || "";
    activeButton = btn;

    workshopModalTitle.textContent = activeWorkshopName;
    const timePlace = [btn.dataset.workshopTime, btn.dataset.workshopPlace]
      .filter(Boolean)
      .join(" • ");
    workshopModalSubtitle.textContent = timePlace;

    workshopForm.reset();
    workshopModal.classList.add("active");
  });
});

function closeWorkshopModal() {
  workshopModal.classList.remove("active");
}

workshopModalClose.addEventListener("click", closeWorkshopModal);

workshopModal.addEventListener("click", (e) => {
  if (e.target === workshopModal) closeWorkshopModal();
});

workshopForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const data = {
    action: "workshop_register",
    workshopId: activeWorkshopId,
    workshopName: activeWorkshopName,
    workshopPlace: activeWorkshopPlace,
    fullName: wsFullName.value.trim(),
    email: wsEmail.value.trim(),
    phone: wsPhone.value.trim(),
  };

  wsSubmitBtn.disabled = true;
  wsSubmitBtn.textContent = "Booking...";

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.status === "success") {
      closeWorkshopModal();
      successModal.classList.add("active");
      if (activeButton && result.full) {
        markFullyBooked(activeButton);
      }
    } else if (result.status === "full") {
      if (activeButton) markFullyBooked(activeButton);
      closeWorkshopModal();
      alert("Sorry, this workshop just filled up.");
    } else if (result.status === "duplicate") {
      alert(result.message || "You're already registered for this workshop.");
    } else {
      alert("Something went wrong: " + (result.message || "please try again"));
    }
  } catch (err) {
    alert("Connection issue, please try again. (" + err.message + ")");
  } finally {
    wsSubmitBtn.disabled = false;
    wsSubmitBtn.textContent = "Confirm Booking";
  }
});

wsCloseSuccessBtn.addEventListener("click", function () {
  successModal.classList.remove("active");
});

loadWorkshopCounts();
