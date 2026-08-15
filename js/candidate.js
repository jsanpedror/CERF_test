// js/candidate.js (Step 3)
// Guards access (must have passed login), captures candidate info, stores in sessionStorage.

(function () {
  // Basic guard: ensure user passed login gate
  const granted = sessionStorage.getItem("diagnostic_access_granted") === "true";
  if (!granted) {
    window.location.replace("login.html");
    return;
  }

  // UI helpers
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const accessCode = sessionStorage.getItem("diagnostic_access_code") || "—";
  const badge = document.getElementById("accessBadge");
  if (badge) badge.textContent = `Access: ${accessCode}`;

  const form = document.getElementById("candidateForm");
  const errorBox = document.getElementById("errorBox");
  const privacyLink = document.getElementById("privacyLink");

  privacyLink?.addEventListener("click", (e) => {
    e.preventDefault();
    alert(
      "Privacy notice (v1):\n\n" +
      "Your responses and contact details are used only to review your diagnostic assessment and schedule an interview.\n" +
      "Results are not displayed on-screen. They are reviewed by an academic consultant."
    );
  });

  function showError(msg) {
    errorBox.style.display = "block";
    errorBox.innerHTML = msg;
  }
  function clearError() {
    errorBox.style.display = "none";
    errorBox.textContent = "";
  }

  function isValidEmail(email) {
    // Simple validation (good enough for v1)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function looksLikePhone(phone) {
    // Accepts +, numbers, spaces, parentheses, hyphens.
    return /^[+]?[\d\s().-]{7,20}$/.test(phone.trim());
  }

  // Prefill if user refreshed
  function prefill() {
    const saved = sessionStorage.getItem("diagnostic_candidate");
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      if (data.fullName) document.getElementById("fullName").value = data.fullName;
      if (data.email) document.getElementById("email").value = data.email;
      if (data.whatsapp) document.getElementById("whatsapp").value = data.whatsapp;
      if (data.field) document.getElementById("field").value = data.field;

      if (data.studiedBefore) {
        const radios = document.querySelectorAll('input[name="studiedBefore"]');
        radios.forEach(r => { if (r.value === data.studiedBefore) r.checked = true; });
      }
      if (data.consent === true) document.getElementById("consent").checked = true;
    } catch {
      // ignore
    }
  }
  prefill();

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    clearError();

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const whatsapp = document.getElementById("whatsapp").value.trim();
    const field = document.getElementById("field").value.trim();
    const consent = document.getElementById("consent").checked;

    const studiedBeforeEl = document.querySelector('input[name="studiedBefore"]:checked');
    const studiedBefore = studiedBeforeEl ? studiedBeforeEl.value : "";

    if (!fullName) {
      showError("<strong>Error:</strong> Please enter your full name.");
      return;
    }
    if (!email || !isValidEmail(email)) {
      showError("<strong>Error:</strong> Please enter a valid email address.");
      return;
    }
    if (!whatsapp || !looksLikePhone(whatsapp)) {
      showError("<strong>Error:</strong> Please enter a valid WhatsApp number (include country code, e.g., +52).");
      return;
    }
    if (!studiedBefore) {
      showError("<strong>Error:</strong> Please select whether you have studied English before.");
      return;
    }
    if (!consent) {
      showError("<strong>Error:</strong> Please accept the consent checkbox to continue.");
      return;
    }

    const payload = {
      accessCode: sessionStorage.getItem("diagnostic_access_code") || "",
      fullName,
      email,
      whatsapp,
      studiedBefore,
      field,
      consent: true,
      timestampISO: new Date().toISOString()
    };

    sessionStorage.setItem("diagnostic_candidate", JSON.stringify(payload));

    // Next step (Step 4): instructions.html
    window.location.href = "instructions.html";
  });
})();
