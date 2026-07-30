const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby7DQYqBxAnoMZLYsb5z-ifzgDTz_P3p891oELC2KJZ_JwYMS5E3E3y2B0TJ9Dje98r/exec";

const form = document.getElementById("registrationForm");
const successModal = document.getElementById("successModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const submitBtn = form.querySelector(".submit-btn");

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const attendees = [];
  for (let i = 1; i <= 5; i++) {
    attendees.push({
      fullName: document.getElementById("fullName" + i).value.trim(),
      email: document.getElementById("email" + i).value.trim(),
      phone: document.getElementById("phone" + i).value.trim(),
      gender: form.querySelector('input[name="gender' + i + '"]:checked')?.value || "",
      age: document.getElementById("age" + i).value.trim(),
      governorate: document.getElementById("governorate" + i).value.trim(),
      university: document.getElementById("university" + i).value.trim(),
      faculty: document.getElementById("faculty" + i).value.trim(),
      major: document.getElementById("major" + i).value.trim(),
      academicYear: document.getElementById("academicYear" + i).value,
    });
  }

  const data = {
    action: "group_register",
    groupSize: 5,
    attendees: attendees,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.status === "success") {
      successModal.classList.add("active");
      form.reset();
    } else {
      alert("Something went wrong: " + (result.message || "please try again"));
    }
  } catch (err) {
    alert("Connection issue, please try again. (" + err.message + ")");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
  }
});

closeModalBtn.addEventListener("click", function () {
  successModal.classList.remove("active");
});
