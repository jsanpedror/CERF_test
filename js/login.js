// js/login.js (Step 2)
// Simple access gate: username must equal password (not real security).
// Stores a "session" flag for later pages (candidate form) using sessionStorage.

(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const form = document.getElementById("loginForm");
  const userEl = document.getElementById("username");
  const passEl = document.getElementById("password");
  const errorBox = document.getElementById("errorBox");

  const showHintBtn = document.getElementById("showHintBtn");
  const contactLink = document.getElementById("contactLink");

  function showError(message) {
    errorBox.style.display = "block";
    errorBox.innerHTML = message;
  }

  function clearError() {
    errorBox.style.display = "none";
    errorBox.textContent = "";
  }

  showHintBtn?.addEventListener("click", () => {
    alert(
      "If you don't have credentials yet, please contact your academic consultant.\n\n" +
      "Example format: Guest1 / Guest1 (username and password are the same)."
    );
  });

  contactLink?.addEventListener("click", (e) => {
    e.preventDefault();
    alert("Contact: We'll add your WhatsApp/email here later (Step 12).");
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    clearError();

    const username = (userEl?.value || "").trim();
    const password = (passEl?.value || "").trim();

    if (!username || !password) {
      showError("<strong>Error:</strong> Please enter both username and password.");
      return;
    }

    // Core rule: username must match password
    if (username !== password) {
      showError("<strong>Invalid credentials.</strong> Please contact your consultant for access.");
      return;
    }

    // Optional: basic formatting rule (keeps it looking intentional)
    // Example accepted values: Guest1, Guest2, Candidate7, etc.
    // You can remove this block if you want ANY matching strings to work.
    const looksIntentional = /^[A-Za-z][A-Za-z0-9_-]{2,20}$/.test(username);
    if (!looksIntentional) {
      showError(
        "<strong>Invalid format.</strong> Please use the credentials exactly as provided (e.g., Guest1)."
      );
      return;
    }

    // Save "session" for the next pages
    sessionStorage.setItem("diagnostic_access_granted", "true");
    sessionStorage.setItem("diagnostic_access_code", username);

    // Next step page (we'll build this in Step 3)
    window.location.href = "candidate.html";
  });
})();
