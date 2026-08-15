// js/writing.js (Step 7 + Formspree send)
// Captures writing response, stores result, POSTs full submission to Formspree,
// then redirects to completion.html.

(function () {
  if (!window.requireCandidate()) return;
  window.setStage("writing");

  document.getElementById("year").textContent = new Date().getFullYear();

  const candidateRaw = sessionStorage.getItem("diagnostic_candidate");
  let candidate = {};
  try { candidate = JSON.parse(candidateRaw || "{}"); } catch {}

  document.getElementById("candidateBadge").textContent = `Candidate: ${candidate.fullName || "—"}`;

  const promptBox = document.getElementById("promptBox");
  const responseEl = document.getElementById("response");
  const wordCountEl = document.getElementById("wordCount");
  const submitBtn = document.getElementById("submitBtn");
  const saveExitBtn = document.getElementById("saveExitBtn");
  const errorBox = document.getElementById("errorBox");
  const restartLink = document.getElementById("restartLink");

  const PROMPT = {
    id: "W-1",
    minWords: 30,
    recommendedMin: 120,
    recommendedMax: 180,
    text:
      "Prompt:\n" +
      "In your opinion, what are the most effective ways to learn a foreign language?\n\n" +
      "Write a short response. You may include examples from your own experience."
  };

  promptBox.textContent = PROMPT.text;
  document.getElementById("targetRange").textContent = `${PROMPT.recommendedMin}–${PROMPT.recommendedMax}`;

  function showError(msg, isHardError = false) {
    errorBox.style.display = "block";
    errorBox.innerHTML = msg;
    if (isHardError) {
      errorBox.style.borderColor = "rgba(255,107,107,.35)";
      errorBox.style.background = "rgba(255,107,107,.10)";
    } else {
      errorBox.style.borderColor = "rgba(255,255,255,.18)";
      errorBox.style.background = "rgba(255,255,255,.06)";
    }
  }
  function clearError() {
    errorBox.style.display = "none";
    errorBox.textContent = "";
  }

  function countWords(text) {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }

  function updateUI() {
    const wc = countWords(responseEl.value);
    wordCountEl.textContent = String(wc);
    submitBtn.disabled = wc < PROMPT.minWords;

    clearError();
    if (wc > 0 && wc < PROMPT.recommendedMin) {
      showError(
        `<strong>Suggestion:</strong> Try to write closer to ${PROMPT.recommendedMin}–${PROMPT.recommendedMax} words for a more accurate review.`,
        false
      );
    } else if (wc > PROMPT.recommendedMax) {
      showError(
        `<strong>Suggestion:</strong> You may shorten your response to around ${PROMPT.recommendedMin}–${PROMPT.recommendedMax} words.`,
        false
      );
    }
  }

  // Prefill draft
  const savedDraft = sessionStorage.getItem("diagnostic_writing");
  if (savedDraft) {
    try {
      const data = JSON.parse(savedDraft);
      if (data && typeof data.responseText === "string") responseEl.value = data.responseText;
    } catch {}
  }
  updateUI();

  responseEl.addEventListener("input", () => {
    sessionStorage.setItem(
      "diagnostic_writing",
      JSON.stringify({
        promptId: PROMPT.id,
        responseText: responseEl.value,
        updatedAtISO: new Date().toISOString()
      })
    );
    updateUI();
  });

  saveExitBtn.addEventListener("click", () => {
    sessionStorage.setItem(
      "diagnostic_writing",
      JSON.stringify({
        promptId: PROMPT.id,
        responseText: responseEl.value,
        updatedAtISO: new Date().toISOString()
      })
    );
    alert("Your progress has been saved on this device. You may return later using the same browser.");
    window.location.href = "index.html";
  });

  function safeParse(raw) {
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  function buildSubmissionObject(writingResult) {
    const accessCode = sessionStorage.getItem("diagnostic_access_code") || "";
    const reading = safeParse(sessionStorage.getItem("diagnostic_reading_result"));
    const listening = safeParse(sessionStorage.getItem("diagnostic_listening_result"));

    return {
      meta: {
        accessCode,
        userAgent: navigator.userAgent,
        submittedAtISO: writingResult.submittedAtISO
      },
      candidate,
      reading,
      listening,
      writing: writingResult
    };
  }

  async function sendToFormspree(submissionObj) {
    const sentFlag = sessionStorage.getItem("diagnostic_formspree_sent") === "true";
    if (sentFlag) return { skipped: true };

    const endpoint = window.FORMSPREE_CONFIG?.ENDPOINT;
    if (!endpoint) throw new Error("Missing Formspree endpoint (FORMSPREE_CONFIG.ENDPOINT).");

    // Formspree accepts regular form fields. We'll send both human-friendly fields + full JSON.
    const payload = {
      candidate_name: submissionObj.candidate?.fullName || "—",
      candidate_email: submissionObj.candidate?.email || "—",
      candidate_whatsapp: submissionObj.candidate?.whatsapp || "—",
      access_code: submissionObj.meta.accessCode || "—",
      reading_estimate: submissionObj.reading?.estimate || "—",
      listening_estimate: submissionObj.listening?.estimate || "—",
      writing_word_count: submissionObj.writing?.wordCount ?? "—",
      writing_text: submissionObj.writing?.responseText || "",
      submitted_at: submissionObj.meta.submittedAtISO,
      submission_json: JSON.stringify(submissionObj, null, 2)
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Formspree error: ${res.status} ${res.statusText} ${txt}`);
    }

    sessionStorage.setItem("diagnostic_formspree_sent", "true");
    return { sent: true };
  }

  submitBtn.addEventListener("click", async () => {
    const wc = countWords(responseEl.value);
    if (wc < PROMPT.minWords) {
      showError(`<strong>Error:</strong> Please write at least ${PROMPT.minWords} words to submit.`, true);
      return;
    }

    const writingResult = {
      promptId: PROMPT.id,
      promptText: PROMPT.text,
      responseText: responseEl.value.trim(),
      wordCount: wc,
      submittedAtISO: new Date().toISOString()
    };
    sessionStorage.setItem("diagnostic_writing_result", JSON.stringify(writingResult));

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";

    try {
      const submissionObj = buildSubmissionObject(writingResult);
      await sendToFormspree(submissionObj);
      window.location.href = "completion.html";
    } catch (err) {
      console.error(err);
      showError(
        "<strong>Submission saved.</strong> We could not send it automatically. " +
        "Please contact your academic consultant and provide your reference code.",
        true
      );
      submitBtn.textContent = "Submit Writing →";
      submitBtn.disabled = false;
    }
  });

  restartLink.addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Restart Writing section? (Dev only)")) {
      sessionStorage.removeItem("diagnostic_writing");
      sessionStorage.removeItem("diagnostic_writing_result");
      sessionStorage.removeItem("diagnostic_formspree_sent");
      window.location.reload();
    }
  });
})();
