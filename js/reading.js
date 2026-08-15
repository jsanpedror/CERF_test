// js/reading.js
// Multistage adaptive reading using CEFR anchor bank (A2 → C1).
// Flow: Start at A2 → route to B1/B2/C1 → stop with estimate.
// Stores: responses + anchor scores + estimated level in sessionStorage.

const ANCHORS = window.READING_ANCHORS;
console.log("reading.js sees anchors:", ANCHORS?.length, ANCHORS?.map(a => a.id));

(function () {
  // Guards
  if (!window.requireCandidate()) return;
  window.setStage("reading");

  // UI helpers
  document.getElementById("year").textContent = new Date().getFullYear();

  const candidateRaw = sessionStorage.getItem("diagnostic_candidate");
  try {
    const c = JSON.parse(candidateRaw || "{}");
    document.getElementById("candidateBadge").textContent = `Candidate: ${c.fullName || "—"}`;
  } catch {
    document.getElementById("candidateBadge").textContent = "Candidate: —";
  }

  // Elements (keep your existing IDs)
  const passageEl = document.getElementById("passage");
  const questionEl = document.getElementById("question");
  const formEl = document.getElementById("optionsForm");
  const nextBtn = document.getElementById("nextBtn");
  const errorBox = document.getElementById("errorBox");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const blockBadge = document.getElementById("blockBadge");
  const restartLink = document.getElementById("restartLink");
  const saveExitBtn = document.getElementById("saveExitBtn");

  function showError(msg) {
    errorBox.style.display = "block";
    errorBox.innerHTML = msg;
  }
  function clearError() {
    errorBox.style.display = "none";
    errorBox.textContent = "";
  }

  // ----------------------------
  // Anchor helpers
  // ----------------------------
  function getAnchorById(id) {
    return (ANCHORS || []).find(a => a.id === id) || null;
  }

  // Max possible questions if a user reaches C1
  const MAX_Q = (ANCHORS || []).reduce((sum, a) => sum + (a.questions?.length || 0), 0) || 14;

  // ----------------------------
  // Session state
  // ----------------------------
  const state = {
    anchorsTaken: [],        // e.g., ["A2","B1","B2"]
    anchorScores: {},        // e.g., {A2:3, B1:2}
    responses: [],           // {id, anchor, chosenIndex, correctIndex, isCorrect}
    currentAnchorId: null,   // "A2" etc
    qIndexInAnchor: 0,       // 0..(n-1)
    selectedChoice: null
  };

  function resetReadingDev() {
    sessionStorage.removeItem("diagnostic_reading");
    window.location.reload();
  }

  if (restartLink) {
  restartLink.addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Restart Reading section? (Dev only)")) resetReadingDev();
  });
}

  // Load saved state if user refreshed
  const saved = sessionStorage.getItem("diagnostic_reading");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(state, parsed);
    } catch {}
  }

  function persist() {
    sessionStorage.setItem("diagnostic_reading", JSON.stringify(state));
  }

  function setAnchor(anchorId) {
    const a = getAnchorById(anchorId);
    if (!a) {
      showError(`<strong>Config error:</strong> anchor "${anchorId}" not found.`);
      return false;
    }
    state.currentAnchorId = anchorId;
    if (!state.anchorsTaken.includes(anchorId)) state.anchorsTaken.push(anchorId);
    state.qIndexInAnchor = 0;
    state.selectedChoice = null;

    blockBadge.textContent = `Block: ${anchorId}`;
    persist();
    return true;
  }

  function computeProgress() {
    const seen = state.responses.length;
    const pct = Math.min(100, Math.round((seen / MAX_Q) * 100));
    progressFill.style.width = `${pct}%`;
    progressText.textContent = `Reading • Question ${Math.min(seen + 1, MAX_Q)} / ${MAX_Q}`;
  }

  function renderQuestion() {
    clearError();
    nextBtn.disabled = true;
    state.selectedChoice = null;

    const anchor = getAnchorById(state.currentAnchorId);
    if (!anchor) {
      showError(`<strong>Config error:</strong> current anchor missing.`);
      return;
    }

    const q = anchor.questions[state.qIndexInAnchor];
    if (!q) {
      showError(`<strong>Config error:</strong> question missing in ${anchor.id}.`);
      return;
    }

    // One passage per anchor (same text for all questions in that anchor)
    passageEl.textContent = anchor.text;

    const totalQs = anchor.questions.length;
    questionEl.textContent = `Q${state.qIndexInAnchor + 1} (${anchor.id}, ${totalQs} questions): ${q.prompt}`;

    // Render options
    formEl.innerHTML = "";
    q.options.forEach((optText, idx) => {
      const id = `opt_${idx}`;
      const label = document.createElement("label");
      label.className = "opt";
      label.setAttribute("for", id);

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "answer";
      input.id = id;
      input.value = String(idx);

      const textWrap = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = `Option ${String.fromCharCode(65 + idx)}`;
      const span = document.createElement("span");
      span.textContent = optText;

      textWrap.appendChild(strong);
      textWrap.appendChild(span);

      label.appendChild(input);
      label.appendChild(textWrap);

      label.addEventListener("click", () => {
        input.checked = true;
        state.selectedChoice = idx;
        nextBtn.disabled = false;
      });

      formEl.appendChild(label);
    });

    computeProgress();
    persist();
  }

  function gradeCurrentAndAdvance() {
    const anchor = getAnchorById(state.currentAnchorId);
    if (!anchor) {
      showError(`<strong>Config error:</strong> current anchor missing.`);
      return;
    }

    const q = anchor.questions[state.qIndexInAnchor];
    if (!q) {
      showError(`<strong>Config error:</strong> question missing in ${anchor.id}.`);
      return;
    }

    if (state.selectedChoice === null) {
      showError("<strong>Please select an answer</strong> to continue.");
      return;
    }

    const isCorrect = state.selectedChoice === q.correctIndex;

    state.responses.push({
      id: q.id,
      anchor: anchor.id,
      chosenIndex: state.selectedChoice,
      correctIndex: q.correctIndex,
      isCorrect
    });

    // Update score for this anchor
    if (state.anchorScores[anchor.id] == null) state.anchorScores[anchor.id] = 0;
    if (isCorrect) state.anchorScores[anchor.id] += 1;

    // Advance within anchor
    state.qIndexInAnchor += 1;
    state.selectedChoice = null;
    persist();

    // End of anchor?
    if (state.qIndexInAnchor >= anchor.questions.length) {
      routeAfterAnchor(anchor.id);
    } else {
      renderQuestion();
    }
  }

  function routeAfterAnchor(anchorId) {
    const anchor = getAnchorById(anchorId);
    const score = state.anchorScores[anchorId] || 0;
    const max = anchor?.questions?.length || 0;

    // Use anchor routing rules (as defined in reading_anchors.js)
    if (anchorId === "A2") {
      // A2: only advance if perfect
      if (score >= 3) {
        setAnchor("B1");
        renderQuestion();
        return;
      }
      finalizeReadingEstimate("A2", score, max, "");
      return;
    }

    if (anchorId === "B1") {
      // 3–4 -> B2 ; 2 -> B1 ; 0–1 -> A2
      if (score >= 3) {
        setAnchor("B2");
        renderQuestion();
        return;
      }
      if (score === 2) {
        finalizeReadingEstimate("B1", score, max, "borderline B2");
        return;
      }
      finalizeReadingEstimate("A2", score, max, "below B1");
      return;
    }

    if (anchorId === "B2") {
      // 3–4 -> C1 ; 2 -> B2 ; 0–1 -> B1
      if (score >= 3) {
        setAnchor("C1");
        renderQuestion();
        return;
      }
      if (score === 2) {
        finalizeReadingEstimate("B2", score, max, "borderline C1");
        return;
      }
      finalizeReadingEstimate("B1", score, max, "below B2");
      return;
    }

    if (anchorId === "C1") {
      // Ceiling: 3 -> C1 ; 2 -> C1- ; 0–1 -> B2
      if (score >= 3) {
        finalizeReadingEstimate("C1", score, max, "");
        return;
      }
      if (score === 2) {
        finalizeReadingEstimate("C1-", score, max, "borderline C1");
        return;
      }
      finalizeReadingEstimate("B2", score, max, "below C1");
      return;
    }

    // Fallback
    finalizeReadingEstimate(anchorId, score, max, "");
  }

  function finalizeReadingEstimate(estimate, lastScore, lastMax, note) {
    const readingResult = {
      estimate, // "A2" | "B1" | "B2" | "C1" | "C1-"
      note: note || "",
      anchorsTaken: state.anchorsTaken,
      anchorScores: state.anchorScores,
      responses: state.responses,
      completedAtISO: new Date().toISOString()
    };

    sessionStorage.setItem("diagnostic_reading_result", JSON.stringify(readingResult));

    // Go to listening section
    window.location.href = "listening.html";
  }

  // Save & Exit
  saveExitBtn.addEventListener("click", () => {
    persist();
    alert("Your progress has been saved on this device. You may return later using the same browser.");
    window.location.href = "index.html";
  });

  // Next
  nextBtn.addEventListener("click", gradeCurrentAndAdvance);

  // Init: Start at A2 unless already in progress
  if (!state.currentAnchorId) setAnchor("A2");
  blockBadge.textContent = `Block: ${state.currentAnchorId}`;

  renderQuestion();
})();
