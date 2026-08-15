// js/listening.js
// Multistage adaptive listening with real MP3 audio
// Single-play enforced per question
// Stores listening responses + estimate in sessionStorage
// Next: writing.html

(function () {
  if (!window.requireCandidate()) return;
  window.setStage("listening");

  document.getElementById("year").textContent = new Date().getFullYear();

  const candidateRaw = sessionStorage.getItem("diagnostic_candidate");
  try {
    const c = JSON.parse(candidateRaw || "{}");
    document.getElementById("candidateBadge").textContent = `Candidate: ${c.fullName || "—"}`;
  } catch {
    document.getElementById("candidateBadge").textContent = "Candidate: —";
  }

  const playBtn = document.getElementById("playBtn");
  const playStatus = document.getElementById("playStatus");
  const questionEl = document.getElementById("question");
  const formEl = document.getElementById("optionsForm");
  const nextBtn = document.getElementById("nextBtn");
  const errorBox = document.getElementById("errorBox");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const blockBadge = document.getElementById("blockBadge");
  const restartLink = document.getElementById("restartLink");
  const saveExitBtn = document.getElementById("saveExitBtn");

  let currentAudio = null;

  function showError(msg) {
    errorBox.style.display = "block";
    errorBox.innerHTML = msg;
  }

  function clearError() {
    errorBox.style.display = "none";
    errorBox.textContent = "";
  }

  const BANK = {
    A2: [
      {
        id: "L-A2-1",
        audioSrc: "audio/a2-1.mp3",
        q: "Where will the workshop take place?",
        options: [
          "In the same training center",
          "Near the central library",
          "At the central library"
        ],
        correct: 1
      },
      {
        id: "L-A2-2",
        audioSrc: "audio/a2-2.mp3",
        q: "When will the bus leave?",
        options: [
          "At four thirty",
          "In ten minutes",
          "In fifteen minutes"
        ],
        correct: 1
      },
      {
        id: "L-A2-3",
        audioSrc: "audio/a2-3.mp3",
        q: "What is the purpose of the message?",
        options: [
          "To remind someone about an appointment",
          "To change the appointment schedule",
          "To explain how to get to the clinic"
        ],
        correct: 0
      }
    ],

    B1: [
      {
        id: "L-B1-1",
        audioSrc: "audio/b1-1.mp3",
        q: "What did the speaker learn from the experience?",
        options: [
          "It is difficult to cook without all the ingredients",
          "Being flexible can lead to good results",
          "Recipes found online are not reliable"
        ],
        correct: 1
      },
      {
        id: "L-B1-2",
        audioSrc: "audio/b1-2.mp3",
        q: "What is the speaker planning to do in the future?",
        options: [
          "Ask the manager to reschedule meetings",
          "Leave home earlier",
          "Use a different type of transportation"
        ],
        correct: 1
      },
      {
        id: "L-B1-3",
        audioSrc: "audio/b1-3.mp3",
        q: "Why is the speaker taking the course?",
        options: [
          "To improve how they use their camera",
          "To turn photography into a career",
          "To spend more time on a hobby"
        ],
        correct: 0
      }
    ],

    B2: [
      {
        id: "L-B2-1",
        audioSrc: "audio/b2-1.mp3",
        q: "What is the speaker’s overall view of remote work?",
        options: [
          "It can increase productivity, but only under certain conditions",
          "It creates more problems than benefits",
          "It mainly helps because it offers flexibility"
        ],
        correct: 0
      },
      {
        id: "L-B2-2",
        audioSrc: "audio/b2-2.mp3",
        q: "What does the speaker imply about online education?",
        options: [
          "It is effective only for certain types of learners",
          "It works best with constant supervision",
          "It depends mainly on technology"
        ],
        correct: 0
      },
      {
        id: "L-B2-3",
        audioSrc: "audio/b2-3.mp3",
        q: "What is the main point about public transportation?",
        options: [
          "Its success depends on continued investment and planning",
          "It has solved congestion problems",
          "It is becoming less reliable"
        ],
        correct: 0
      }
    ],

    C1: [
      {
        id: "L-C1-1",
        audioSrc: "audio/c1-1.mp3",
        q: "What contradiction does the speaker highlight in some organizations?",
        options: [
          "They promote innovation but discourage the risks required for it",
          "They expect experimentation to succeed without failure",
          "They invest in innovation without clear goals"
        ],
        correct: 0
      },
      {
        id: "L-C1-2",
        audioSrc: "audio/c1-2.mp3",
        q: "What is the speaker’s attitude toward technology in education?",
        options: [
          "It is beneficial only when used with clear purpose and preparation",
          "It improves learning in most situations",
          "It often distracts students regardless of use"
        ],
        correct: 0
      },
      {
        id: "L-C1-3",
        audioSrc: "audio/c1-3.mp3",
        q: "What is central to effective leadership according to the speaker?",
        options: [
          "Encouraging contribution through trust and collaboration",
          "Maintaining authority while allowing some participation",
          "Creating stability through control"
        ],
        correct: 0
      }
    ]
  };

  const THRESH_PASS = 2; // out of 3

  const state = {
    blocksTaken: [],
    blockScores: {},
    responses: [],
    currentBlock: null,
    qIndexInBlock: 0,
    selectedChoice: null,
    playedCurrent: false,
    playedMap: {}
  };

  const saved = sessionStorage.getItem("diagnostic_listening");
  if (saved) {
    try {
      Object.assign(state, JSON.parse(saved));
    } catch {}
  }

  function persist() {
    sessionStorage.setItem("diagnostic_listening", JSON.stringify(state));
  }

  function setBlock(block) {
    state.currentBlock = block;
    if (!state.blocksTaken.includes(block)) state.blocksTaken.push(block);
    state.qIndexInBlock = 0;
    state.selectedChoice = null;
    state.playedCurrent = false;
    blockBadge.textContent = `Block: ${block}`;
    persist();
  }

  function computeProgress() {
    const MAX = 9;
    const seen = state.responses.length;
    const pct = Math.min(100, Math.round((seen / MAX) * 100));
    progressFill.style.width = `${pct}%`;
    progressText.textContent = `Listening • Question ${Math.min(seen + 1, MAX)} / ${MAX}`;
  }

  function getCurrentItem() {
    const items = BANK[state.currentBlock];
    return items[state.qIndexInBlock];
  }

  function setPlayUI() {
    const item = getCurrentItem();
    const alreadyPlayed = !!state.playedMap[item.id];

    if (alreadyPlayed) {
      playBtn.disabled = true;
      playStatus.textContent = "Audio already played (single play)";
      state.playedCurrent = true;
    } else {
      playBtn.disabled = false;
      playStatus.textContent = "Not played yet";
      state.playedCurrent = false;
    }
  }

  function stopCurrentAudio() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
  }

  function playAudio(src, itemId) {
    if (state.playedMap[itemId]) return;

    clearError();
    stopCurrentAudio();

    currentAudio = new Audio(src);
    currentAudio.preload = "auto";

    playBtn.disabled = true;
    playStatus.textContent = "Playing…";

    currentAudio.addEventListener("ended", () => {
      playStatus.textContent = "Played (single play)";
    });

    currentAudio.addEventListener("error", () => {
      playBtn.disabled = false;
      playStatus.textContent = "Audio error";
      showError("<strong>Audio could not be loaded.</strong> Please check the file path and filename.");
    });

    currentAudio.play()
      .then(() => {
        state.playedMap[itemId] = true;
        state.playedCurrent = true;
        persist();
      })
      .catch(() => {
        playBtn.disabled = false;
        playStatus.textContent = "Playback blocked";
        showError("<strong>Audio could not be played.</strong> Try clicking the play button again.");
      });
  }

  function renderQuestion() {
    clearError();
    nextBtn.disabled = true;
    state.selectedChoice = null;

    stopCurrentAudio();

    const item = getCurrentItem();
    questionEl.textContent = `Q${state.qIndexInBlock + 1} (${state.currentBlock}): ${item.q}`;

    formEl.innerHTML = "";
    item.options.forEach((optText, idx) => {
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

    setPlayUI();
    computeProgress();
    persist();
  }

  function gradeAndAdvance() {
    const item = getCurrentItem();

    if (state.selectedChoice === null) {
      showError("<strong>Please select an answer</strong> to continue.");
      return;
    }

    if (!state.playedMap[item.id]) {
      showError("<strong>Please play the audio</strong> before answering (single play).");
      return;
    }

    const isCorrect = state.selectedChoice === item.correct;

    state.responses.push({
      id: item.id,
      block: state.currentBlock,
      chosenIndex: state.selectedChoice,
      correctIndex: item.correct,
      isCorrect
    });

    if (!state.blockScores[state.currentBlock]) state.blockScores[state.currentBlock] = 0;
    if (isCorrect) state.blockScores[state.currentBlock] += 1;

    state.qIndexInBlock += 1;
    state.selectedChoice = null;
    persist();

    const items = BANK[state.currentBlock];
    if (state.qIndexInBlock >= items.length) {
      routeAfterBlock(state.currentBlock);
    } else {
      renderQuestion();
    }
  }

  function routeAfterBlock(block) {
    const score = state.blockScores[block] || 0;

    if (block === "B1") {
      if (score >= THRESH_PASS) {
        setBlock("B2");
        renderQuestion();
        return;
      } else {
        setBlock("A2");
        renderQuestion();
        return;
      }
    }

    if (block === "B2") {
      if (score >= THRESH_PASS) {
        setBlock("C1");
        renderQuestion();
        return;
      } else {
        finalizeListeningEstimate();
        return;
      }
    }

    if (block === "A2" || block === "C1") {
      finalizeListeningEstimate();
      return;
    }

    finalizeListeningEstimate();
  }

  function finalizeListeningEstimate() {
    const sA2 = state.blockScores.A2 ?? null;
    const sB1 = state.blockScores.B1 ?? null;
    const sB2 = state.blockScores.B2 ?? null;
    const sC1 = state.blockScores.C1 ?? null;

    let estimate = "A2";
    let note = "";

    if (sB1 !== null && sB1 >= THRESH_PASS) estimate = "B1";
    if (sB2 !== null && sB2 >= THRESH_PASS) estimate = "B2";
    if (sC1 !== null && sC1 >= THRESH_PASS) estimate = "C1";

    if (sA2 !== null && sA2 < THRESH_PASS && sB1 !== null && sB1 < THRESH_PASS) {
      estimate = "A1";
      note = "below A2";
    }

    if (estimate === "B1" && sB2 !== null && sB2 === 1) note = "borderline B2";
    if (estimate === "B2" && sC1 !== null && sC1 === 1) note = "borderline C1";
    if (estimate === "A2" && sA2 !== null && sA2 >= THRESH_PASS && sB1 !== null && sB1 === 1) {
      note = "borderline B1";
    }

    const listeningResult = {
      estimate,
      note,
      blocksTaken: state.blocksTaken,
      blockScores: state.blockScores,
      responses: state.responses,
      completedAtISO: new Date().toISOString()
    };

    sessionStorage.setItem("diagnostic_listening_result", JSON.stringify(listeningResult));
    window.location.href = "writing.html";
  }

  playBtn.addEventListener("click", () => {
    const item = getCurrentItem();
    playAudio(item.audioSrc, item.id);
  });

  nextBtn.addEventListener("click", gradeAndAdvance);

  saveExitBtn.addEventListener("click", () => {
    persist();
    alert("Your progress has been saved on this device. You may return later using the same browser.");
    window.location.href = "index.html";
  });

  restartLink.addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Restart Listening section?")) {
      stopCurrentAudio();
      sessionStorage.removeItem("diagnostic_listening");
      window.location.reload();
    }
  });

  if (!state.currentBlock) setBlock("B1");
  blockBadge.textContent = `Block: ${state.currentBlock}`;
  renderQuestion();
})();


