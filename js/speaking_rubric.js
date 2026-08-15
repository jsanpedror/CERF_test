// js/speaking_rubric.js
// Speaking interview rubric tool:
// - Live total + CEFR suggestion
// - Task examples per task type
// - CEFR prompt bank checkbox tracking + per-level reset buttons
// - Generates summary text + JSON
// - Copy to clipboard
// - Optional send to inbox via Formspree (uses window.FORMSPREE_CONFIG.ENDPOINT)

(function () {
  const $ = (id) => document.getElementById(id);

  const refs = {
    refCode: $("refCode"),
    candidateName: $("candidateName"),
    candidateEmail: $("candidateEmail"),
    candidateWhatsApp: $("candidateWhatsApp"),
    taskType: $("taskType"),
    duration: $("duration"),
    taskExamples: $("taskExamples"),       // NEW (task examples box)
    customPrompts: $("customPrompts"),     // NEW (custom prompts textarea)
    notes: $("notes"),
    totalScore: $("totalScore"),
    cefr: $("cefr"),
    output: $("output"),
    errorBox: $("errorBox"),
    generateBtn: $("generateBtn"),
    copyBtn: $("copyBtn"),
    sendBtn: $("sendBtn"),
    printBtn: $("printBtn"),
  };

  const scoreSelects = Array.from(document.querySelectorAll("select.score"));

  // ---------- UI helpers ----------
  function showError(msg) {
    if (!refs.errorBox) return;
    refs.errorBox.style.display = "block";
    refs.errorBox.innerHTML = msg;
  }

  function clearError() {
    if (!refs.errorBox) return;
    refs.errorBox.style.display = "none";
    refs.errorBox.textContent = "";
  }

  function formatISO(d = new Date()) {
    return d.toISOString();
  }

  // ---------- scoring ----------
  function getScores() {
    const scores = {};
    for (const sel of scoreSelects) {
      const key = sel.dataset.key;
      scores[key] = parseInt(sel.value, 10);
    }
    return scores;
  }

  function total(scores) {
    return Object.values(scores).reduce((a, b) => a + b, 0);
  }

  // Mapping 0–30 -> CEFR speaking suggestion
  // (Keep simple for now; you can calibrate later with real learners.)
  function suggestCEFR(totalScore) {
    if (totalScore <= 6) return "A1";
    if (totalScore <= 11) return "A2";
    if (totalScore <= 17) return "B1";
    if (totalScore <= 23) return "B2";
    if (totalScore <= 27) return "C1";
    return "C2";
  }

  function taskLabel(value) {
    const map = {
      guided: "Guided interview (general)",
      roleplay: "Role-play (work / real-life)",
      picture: "Picture description",
      opinion: "Opinion + follow-up questions",
    };
    return map[value] || value;
  }

  // ---------- task examples (NEW) ----------
  const TASK_EXAMPLES = {
    guided:
`Guided interview (general)
• Warm-up: “Tell me about yourself. What do you do / study?”
• Past: “Tell me about a memorable experience you had recently.”
• Future: “What are your plans for the next year? Why?”
• Follow-up probes: “Can you explain more?” “What do you mean by…?”`,
    roleplay:
`Role-play (work / real-life)
• At a café: order, ask about ingredients, complain politely, request changes.
• At work: request a deadline extension; negotiate priorities; give a status update.
• At a hotel: check-in issue; ask for a quieter room; handle a billing mistake.`,
    picture:
`Picture description
• Describe: people, place, actions (Who? Where? What’s happening?)
• Infer: “What happened before?” “What might happen next?”
• Compare: “How is this picture different from your daily life?”`,
    opinion:
`Opinion + follow-up
• Topic: technology / AI in education / fast fashion / social media.
• Prompt: “Do the benefits outweigh the risks? Why?”
• Follow-up: counterargument, examples, consequences, solutions.`
  };

  function refreshTaskExamples() {
    const key = refs.taskType?.value;
    if (!refs.taskExamples) return;
    refs.taskExamples.textContent = TASK_EXAMPLES[key] || "";
  }

  // ---------- prompt bank tracking (NEW) ----------
  function getCheckedPrompts() {
    const checks = Array.from(document.querySelectorAll("input.promptCheck:checked"));
    return checks.map((cb) => {
      const level = cb.dataset.level || "";
      const text = (cb.parentElement?.querySelector("span")?.textContent || "").trim();
      return level ? `[${level}] ${text}` : text;
    });
  }

  function bindResetButtons() {
    document.querySelectorAll("button.resetLevelBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const level = btn.dataset.level;
        if (!level) return;

        document
          .querySelectorAll(`input.promptCheck[data-level="${level}"]`)
          .forEach((cb) => (cb.checked = false));
      });
    });
  }

  // ---------- summary ----------
  function buildSummary() {
    clearError();

    const refCode = refs.refCode?.value.trim();
    const candidateName = refs.candidateName?.value.trim();

    if (!refCode || !candidateName) {
      showError("<strong>Please fill:</strong> Reference code and Candidate name.");
      return null;
    }

    const scores = getScores();
    const totalScore = total(scores);
    const cefr = suggestCEFR(totalScore);

    // NEW prompts collection
    const checkedPrompts = getCheckedPrompts();
    const customPrompts = (refs.customPrompts?.value || "").trim();

    const summary = {
      meta: {
        type: "speaking_rubric",
        createdAtISO: formatISO(),
      },
      candidate: {
        referenceCode: refCode,
        name: candidateName,
        email: (refs.candidateEmail?.value || "").trim(),
        whatsapp: (refs.candidateWhatsApp?.value || "").trim(),
      },
      session: {
        taskType: refs.taskType?.value,
        taskLabel: taskLabel(refs.taskType?.value),
        durationMin: refs.duration?.value,
        taskExamples: TASK_EXAMPLES[refs.taskType?.value] || "",
        promptsUsed: {
          checked: checkedPrompts,
          custom: customPrompts
        }
      },
      scores: {
        ...scores,
        total: totalScore,
        max: 30,
        suggestedCEFR: cefr,
      },
      notes: (refs.notes?.value || "").trim(),
    };

    const promptsCheckedText =
      summary.session.promptsUsed.checked.length
        ? summary.session.promptsUsed.checked.map((p) => `- ${p}`).join("\n")
        : "—";

    const text =
`SPEAKING INTERVIEW — PLACEMENT NOTES
Reference code: ${summary.candidate.referenceCode}
Candidate: ${summary.candidate.name}
Email: ${summary.candidate.email || "—"}
WhatsApp: ${summary.candidate.whatsapp || "—"}

Interview task: ${summary.session.taskLabel}
Duration: ${summary.session.durationMin} min

Task examples:
${summary.session.taskExamples || "—"}

Prompts used (checked):
${promptsCheckedText}

Custom prompts:
${summary.session.promptsUsed.custom || "—"}

Scores (0–5 each):
Fluency: ${summary.scores.fluency}
Accuracy: ${summary.scores.accuracy}
Range: ${summary.scores.range}
Pronunciation: ${summary.scores.pronunciation}
Interaction: ${summary.scores.interaction}
Coherence: ${summary.scores.coherence}

Total: ${summary.scores.total}/30
Suggested CEFR (speaking): ${summary.scores.suggestedCEFR}

Notes:
${summary.notes || "—"}

(Internal JSON)
${JSON.stringify(summary, null, 2)}
`;

    if (refs.output) refs.output.textContent = text;
    if (refs.copyBtn) refs.copyBtn.disabled = false;
    if (refs.sendBtn) refs.sendBtn.disabled = false;

    return summary;
  }

  // ---------- sending via Formspree ----------
  async function sendToFormspree(summaryObj) {
    const endpoint = window.FORMSPREE_CONFIG?.ENDPOINT;
    if (!endpoint) throw new Error("Missing Formspree endpoint in js/formspree_config.js");

    const promptsChecked =
      summaryObj.session.promptsUsed.checked.length
        ? summaryObj.session.promptsUsed.checked.join("\n")
        : "—";

    const payload = {
      type: "speaking_rubric",
      reference_code: summaryObj.candidate.referenceCode,
      candidate_name: summaryObj.candidate.name,
      candidate_email: summaryObj.candidate.email || "—",
      candidate_whatsapp: summaryObj.candidate.whatsapp || "—",
      task: summaryObj.session.taskLabel,
      duration_min: String(summaryObj.session.durationMin || ""),
      task_examples: summaryObj.session.taskExamples || "—",
      prompts_checked: promptsChecked,
      prompts_custom: summaryObj.session.promptsUsed.custom || "—",
      suggested_cefr_speaking: summaryObj.scores.suggestedCEFR,
      total_score: String(summaryObj.scores.total),
      notes: summaryObj.notes || "—",
      rubric_json: JSON.stringify(summaryObj, null, 2),
      created_at: summaryObj.meta.createdAtISO
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
  }

  // ---------- live totals ----------
  function refreshTotals() {
    const scores = getScores();
    const t = total(scores);
    if (refs.totalScore) refs.totalScore.textContent = String(t);
    if (refs.cefr) refs.cefr.textContent = suggestCEFR(t);
  }

  // ---------- event wiring ----------
  scoreSelects.forEach((sel) => sel.addEventListener("change", refreshTotals));

  if (refs.taskType) {
    refs.taskType.addEventListener("change", () => {
      refreshTaskExamples();
    });
  }

  if (refs.generateBtn) {
    refs.generateBtn.addEventListener("click", () => buildSummary());
  }

  if (refs.copyBtn) {
    refs.copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(refs.output?.textContent || "");
        refs.copyBtn.textContent = "Copied ✓";
        setTimeout(() => (refs.copyBtn.textContent = "Copy"), 1200);
      } catch {
        alert("Could not copy automatically. You can select the text and copy manually.");
      }
    });
  }

  if (refs.sendBtn) {
    refs.sendBtn.addEventListener("click", async () => {
      const summary = buildSummary();
      if (!summary) return;

      refs.sendBtn.disabled = true;
      refs.sendBtn.textContent = "Sending…";
      try {
        await sendToFormspree(summary);
        refs.sendBtn.textContent = "Sent ✓";
        setTimeout(() => {
          refs.sendBtn.textContent = "Send to inbox";
          refs.sendBtn.disabled = false;
        }, 1200);
      } catch (e) {
        console.error(e);
        alert("Could not send automatically. Please copy the summary and save it manually.");
        refs.sendBtn.textContent = "Send to inbox";
        refs.sendBtn.disabled = false;
      }
    });
  }

  if (refs.printBtn) refs.printBtn.addEventListener("click", () => window.print());

  // ---------- init ----------
  bindResetButtons();
  refreshTotals();
  refreshTaskExamples();

  if (refs.output) {
    refs.output.textContent = "(Click “Generate summary” to create the speaking report.)";
  }
})();
