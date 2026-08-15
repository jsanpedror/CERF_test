// js/completion.js (Step 8)
// Completion page: confirms stored submission + shows "consultant will contact you" message.
// No scores are displayed.

(function () {
  if (!window.requireCandidate()) return;
  window.setStage("completion");

  document.getElementById("year").textContent = new Date().getFullYear();

  // Candidate data
  const candidateRaw = sessionStorage.getItem("diagnostic_candidate");
  let candidate = {};
  try { candidate = JSON.parse(candidateRaw || "{}"); } catch {}

  document.getElementById("candidatePill").textContent = `Candidate: ${candidate.fullName || "—"}`;
  document.getElementById("sumName").textContent = candidate.fullName || "—";
  document.getElementById("sumEmail").textContent = candidate.email || "—";
  document.getElementById("sumWhatsApp").textContent = candidate.whatsapp || "—";

  // Reference code from login gate
  const ref = sessionStorage.getItem("diagnostic_access_code") || "—";
  document.getElementById("refCode").textContent = ref;

  // Detect if writing result exists (basic "submission detected" logic)
  const writingResultRaw = sessionStorage.getItem("diagnostic_writing_result");
  const readingResultRaw = sessionStorage.getItem("diagnostic_reading_result");
  const listeningResultRaw = sessionStorage.getItem("diagnostic_listening_result");

  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");

  // "Submitted" timestamp (prefer writing submitted time; else fallback)
  let submittedISO = "";
  try {
    if (writingResultRaw) {
      const w = JSON.parse(writingResultRaw);
      submittedISO = w.submittedAtISO || "";
    }
  } catch {}
  if (!submittedISO) submittedISO = new Date().toISOString();

  document.getElementById("sumSubmitted").textContent = new Date(submittedISO).toLocaleString();

  // Check if Formspree send happened
const sent = sessionStorage.getItem("diagnostic_formspree_sent") === "true";

// Do we have all sections completed?
const hasAll = !!(writingResultRaw && readingResultRaw && listeningResultRaw);

// Status display logic
if (hasAll && sent) {
  statusDot.classList.remove("warn");
  statusText.textContent = "Submitted and sent to consultant";
}
else if (hasAll && !sent) {
  statusDot.classList.add("warn");
  statusText.textContent = "Submitted (sending pending)";
}
else {
  statusDot.classList.add("warn");
  statusText.textContent = "Submission incomplete (dev warning)";
}


  // Start over (dev)
  const startOverBtn = document.getElementById("startOverBtn");
  startOverBtn.addEventListener("click", () => {
    if (!confirm("Clear this device session and start over?")) return;

    // Clear our keys only
    const keysToClear = [
      "diagnostic_access_granted",
      "diagnostic_access_code",
      "diagnostic_stage",
      "diagnostic_candidate",
      "diagnostic_reading",
      "diagnostic_reading_result",
      "diagnostic_listening",
      "diagnostic_listening_result",
      "diagnostic_writing",
      "diagnostic_writing_result"
    ];
    keysToClear.forEach(k => sessionStorage.removeItem(k));

    window.location.href = "index.html";
  });

  // Privacy placeholder
  document.getElementById("privacyLink").addEventListener("click", (e) => {
    e.preventDefault();
    alert(
      "Privacy notice (v1):\n\n" +
      "Your contact details and responses are used only to review your diagnostic assessment and schedule an interview.\n" +
      "Results are not displayed on-screen."
    );
  });
})();
