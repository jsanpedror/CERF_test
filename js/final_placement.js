// js/final_placement.js
// Final placement generator (no backend):
// - Paste Diagnostic JSON + Speaking Rubric JSON
// - Add Writing mini-rubric (0–5) inside this page
// - Computes final CEFR with selectable weighting + decision policy
// - Generates report (copy/print/send via Formspree)

(function () {
  const $ = (id) => document.getElementById(id);

  const refs = {
    refCode: $("refCode"),
    programStart: $("programStart"),
    diagJson: $("diagJson"),
    speakJson: $("speakJson"),
    weightsPreset: $("weightsPreset"),
    policy: $("policy"),
    consultantNotes: $("consultantNotes"),
    computeBtn: $("computeBtn"),
    copyBtn: $("copyBtn"),
    sendBtn: $("sendBtn"),
    printBtn: $("printBtn"),
    errorBox: $("errorBox"),

    consistencyDot: $("consistencyDot"),
    consistencyText: $("consistencyText"),
    finalCefr: $("finalCefr"),

    rCefr: $("rCefr"),
    lCefr: $("lCefr"),
    wCefr: $("wCefr"),
    sCefr: $("sCefr"),
    rNote: $("rNote"),
    lNote: $("lNote"),
    wNote: $("wNote"),
    sNote: $("sNote"),

    output: $("output"),

    // Writing mini-rubric widgets (NEW)
    wDot: $("wDot"),
    wTotal: $("wTotal"),
    wCefrSuggested: $("wCefrSuggested"),
  };

  const wScoreSelects = Array.from(document.querySelectorAll("select.wScore"));

  // CEFR mapping to numeric scale for computation
  const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const CEFR_TO_NUM = Object.fromEntries(CEFR_ORDER.map((c, i) => [c, i]));
  const NUM_TO_CEFR = (n) => CEFR_ORDER[Math.max(0, Math.min(CEFR_ORDER.length - 1, Math.round(n)))];

  function showError(msg) {
    refs.errorBox.style.display = "block";
    refs.errorBox.innerHTML = msg;
  }
  function clearError() {
    refs.errorBox.style.display = "none";
    refs.errorBox.textContent = "";
  }

  function safeParseJson(text) {
    const trimmed = (text || "").trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      return { __parseError: String(e) };
    }
  }

  // Try to extract CEFR from various formats
  function extractCEFR(value) {
    if (!value) return null;

    if (typeof value === "string") {
      const m = value.toUpperCase().match(/\b(A1|A2|B1|B2|C1|C2)\b/);
      return m ? m[1] : null;
    }

    if (typeof value === "object") {
      const candidates = [
        value.estimate,
        value.cefr,
        value.level,
        value.suggestedCEFR,
        value.suggestedCEFR_speaking,
        value.suggestedCEFRSpeaking,
        value.suggestedCEFRReading,
        value.suggestedCEFRListening,
      ];
      for (const c of candidates) {
        const got = extractCEFR(c);
        if (got) return got;
      }
    }

    return null;
  }

  // ----- Writing mini-rubric (NEW) -----
  function getWritingRubricScores() {
    const scores = {};
    for (const sel of wScoreSelects) {
      const k = sel.dataset.key;
      scores[k] = parseInt(sel.value, 10);
    }
    return scores;
  }

  function writingTotal(scores) {
    // 4 criteria * 5 max = 20
    return Object.values(scores).reduce((a, b) => a + b, 0);
  }

  // Conservative mapping 0–20 -> CEFR
  // You can calibrate later with real student scripts.
  function writingCEFRFromTotal(t) {
    if (t <= 4) return "A1";
    if (t <= 7) return "A2";
    if (t <= 11) return "B1";
    if (t <= 15) return "B2";
    if (t <= 18) return "C1";
    return "C2";
  }

  function refreshWritingMiniRubricUI() {
    if (!wScoreSelects.length) return;

    const scores = getWritingRubricScores();
    const t = writingTotal(scores);
    const cefr = writingCEFRFromTotal(t);

    if (refs.wTotal) refs.wTotal.textContent = String(t);
    if (refs.wCefrSuggested) refs.wCefrSuggested.textContent = cefr;

    // Dot turns red if very low writing total (optional cue)
    if (refs.wDot) {
      refs.wDot.classList.remove("warnDot");
      if (t <= 7) refs.wDot.classList.add("warnDot");
    }
  }

  // If any rubric scores are changed away from default? (optional)
  // We’ll treat rubric as “provided” if page has wScore selects (always) — but you may leave defaults.
  // To avoid accidentally forcing rubric usage, we only use rubric if user explicitly toggles "Use rubric"
  // BUT you asked for convenience; so we’ll use rubric if ANY of the writing scores differ from 3.
  function writingRubricIsUsed(scores) {
    const vals = Object.values(scores);
    return vals.some((v) => v !== 3);
  }

  // Fallback inference (old behavior)
  function inferWritingCEFR(writingObj) {
    if (!writingObj || typeof writingObj !== "object") return null;

    const wc = writingObj.wordCount ?? writingObj.word_count ?? null;
    const text = (writingObj.responseText ?? writingObj.writing_text ?? "").trim();

    if (!text) return null;
    if (wc !== null && wc <= 25) return "A1";
    if (wc !== null && wc <= 60) return "A2";
    if (wc !== null && wc <= 120) return "B1";
    if (wc !== null && wc <= 200) return "B2";
    if (wc !== null && wc <= 320) return "C1";
    return "C2";
  }

  function getWeights(preset) {
    if (preset === "fast") {
      return { reading: 0.35, listening: 0.15, writing: 0.10, speaking: 0.40 };
    }
    if (preset === "conservative") {
      return { reading: 0.25, listening: 0.25, writing: 0.20, speaking: 0.30 };
    }
    return { reading: 0.25, listening: 0.20, writing: 0.15, speaking: 0.40 };
  }

  function weightedAverage(levels, weights) {
    let num = 0;
    let den = 0;
    for (const k of Object.keys(weights)) {
      const cefr = levels[k];
      if (!cefr) continue;
      const v = CEFR_TO_NUM[cefr];
      if (v === undefined) continue;
      num += v * weights[k];
      den += weights[k];
    }
    if (den === 0) return null;
    return num / den;
  }

  function lowerBound(levels) {
    const nums = Object.values(levels)
      .filter(Boolean)
      .map((c) => CEFR_TO_NUM[c])
      .filter((n) => n !== undefined);
    if (!nums.length) return null;
    return Math.min(...nums);
  }

  function maxBandGap(levels) {
    const nums = Object.values(levels)
      .filter(Boolean)
      .map((c) => CEFR_TO_NUM[c])
      .filter((n) => n !== undefined);
    if (nums.length < 2) return 0;
    return Math.max(...nums) - Math.min(...nums);
  }

  function buildConsistency(gap) {
    if (gap <= 1) return { label: "High", ok: true };
    if (gap === 2) return { label: "Medium", ok: false };
    return { label: "Low", ok: false };
  }

  function formatISO(d = new Date()) {
    return d.toISOString();
  }

  function compute() {
    clearError();

    const diag = safeParseJson(refs.diagJson.value);
    const speak = safeParseJson(refs.speakJson.value);

    if (diag && diag.__parseError) {
      showError(`<strong>Diagnostic JSON error:</strong> ${diag.__parseError}`);
      return null;
    }
    if (speak && speak.__parseError) {
      showError(`<strong>Speaking JSON error:</strong> ${speak.__parseError}`);
      return null;
    }
    if (!diag || !speak) {
      showError("<strong>Missing input:</strong> paste both Diagnostic JSON and Speaking Rubric JSON.");
      return null;
    }

    // Candidate data (best-effort)
    const candidate = diag.candidate || diag.candidateInfo || {};
    const candName = candidate.fullName || candidate.name || "—";
    const candEmail = candidate.email || "—";
    const candWhats = candidate.whatsapp || "—";

    // Extract skill estimates from diagnostic
    const readingObj = diag.reading || diag.readingResult || diag.reading_result || {};
    const listeningObj = diag.listening || diag.listeningResult || diag.listening_result || {};
    const writingObj = diag.writing || diag.writingResult || diag.writing_result || {};

    const readingCEFR = extractCEFR(readingObj) || extractCEFR(diag.reading_estimate) || null;
    const listeningCEFR = extractCEFR(listeningObj) || extractCEFR(diag.listening_estimate) || null;

    // Speaking CEFR from speaking rubric JSON
    const speakingCEFR =
      extractCEFR(speak?.scores?.suggestedCEFR) ||
      extractCEFR(speak?.scores?.suggestedCEFR_speaking) ||
      extractCEFR(speak?.scores?.suggestedCEFRSpeaking) ||
      extractCEFR(speak) ||
      null;

    // Writing: use mini-rubric if user changed any score away from default 3; else fallback
    const wRubricScores = getWritingRubricScores();
    const wRubricTotal = writingTotal(wRubricScores);
    const wRubricCEFR = writingCEFRFromTotal(wRubricTotal);
    const useWritingRubric = writingRubricIsUsed(wRubricScores);

    const writingCEFR = useWritingRubric
      ? wRubricCEFR
      : (extractCEFR(writingObj) || inferWritingCEFR(writingObj));

    const levels = {
      reading: readingCEFR,
      listening: listeningCEFR,
      writing: writingCEFR,
      speaking: speakingCEFR
    };

    const presentCount = Object.values(levels).filter(Boolean).length;
    if (presentCount < 2) {
      showError("<strong>Not enough data:</strong> I couldn’t detect CEFR for at least two skills. Check your pasted JSON.");
      return null;
    }

    // Compute final using selected policy
    const weights = getWeights(refs.weightsPreset.value);
    const policy = refs.policy.value;

    let finalNum = null;
    if (policy === "lowerBound") {
      finalNum = lowerBound(levels);
    } else if (policy === "speakingGate") {
      const avg = weightedAverage(levels, weights);
      if (avg === null) finalNum = null;
      else {
        const speakingN = speakingCEFR ? CEFR_TO_NUM[speakingCEFR] : null;
        finalNum = (speakingN === null) ? avg : Math.min(avg, speakingN + 1);
      }
    } else {
      finalNum = weightedAverage(levels, weights);
    }

    if (finalNum === null) {
      showError("<strong>Computation failed:</strong> could not compute final level. Check detected CEFR labels.");
      return null;
    }

    const finalCEFR = NUM_TO_CEFR(finalNum);

    // Consistency
    const gap = maxBandGap(levels);
    const consistency = buildConsistency(gap);

    // UI updates
    refs.finalCefr.textContent = finalCEFR;

    refs.consistencyText.textContent = `${consistency.label} (gap: ${gap})`;
    refs.consistencyDot.classList.remove("warnDot");
    if (!consistency.ok) refs.consistencyDot.classList.add("warnDot");

    refs.rCefr.textContent = levels.reading || "—";
    refs.lCefr.textContent = levels.listening || "—";
    refs.wCefr.textContent = levels.writing || "—";
    refs.sCefr.textContent = levels.speaking || "—";

    const writingWC = writingObj.wordCount ?? writingObj.word_count ?? "—";

    refs.rNote.textContent = readingCEFR ? "From diagnostic estimate." : "Not detected.";
    refs.lNote.textContent = listeningCEFR ? "From diagnostic estimate." : "Not detected.";

    refs.wNote.textContent = useWritingRubric
      ? `From mini-rubric (total: ${wRubricTotal}/20).`
      : (levels.writing ? `Fallback inference (wc: ${writingWC}).` : "Not detected.");

    refs.sNote.textContent = speakingCEFR ? "From speaking rubric suggestion." : "Not detected.";

    // Always refresh mini-rubric UI (for output accuracy)
    refreshWritingMiniRubricUI();

    const refCode = (refs.refCode.value || candidate.referenceCode || diag.meta?.accessCode || "—").trim();
    const programStart = (refs.programStart.value || "").trim() || "—";
    const consultantNotes = (refs.consultantNotes.value || "").trim() || "—";

    const createdAt = formatISO();

    const reportObj = {
      meta: {
        type: "final_placement",
        createdAtISO: createdAt,
        policy,
        weightsPreset: refs.weightsPreset.value,
        weights
      },
      candidate: {
        referenceCode: refCode,
        name: candName,
        email: candEmail,
        whatsapp: candWhats
      },
      skillLevels: levels,
      writingMiniRubric: {
        used: useWritingRubric,
        scores: wRubricScores,
        total: wRubricTotal,
        suggestedCEFR: wRubricCEFR
      },
      final: {
        cefr: finalCEFR,
        consistency: { label: consistency.label, gap }
      },
      programStart,
      consultantNotes,
      sources: {
        diagnostic: diag,
        speaking: speak
      }
    };

    const reportText =
`FINAL PLACEMENT REPORT
Reference code: ${reportObj.candidate.referenceCode}
Candidate: ${reportObj.candidate.name}
Email: ${reportObj.candidate.email}
WhatsApp: ${reportObj.candidate.whatsapp}

Skill estimates:
- Reading:   ${reportObj.skillLevels.reading || "—"}
- Listening: ${reportObj.skillLevels.listening || "—"}
- Writing:   ${reportObj.skillLevels.writing || "—"}
- Speaking:  ${reportObj.skillLevels.speaking || "—"}

Writing mini-rubric:
- Used: ${reportObj.writingMiniRubric.used ? "Yes" : "No (fallback inference)"}
- Task achievement: ${reportObj.writingMiniRubric.scores.task}
- Coherence: ${reportObj.writingMiniRubric.scores.coherence}
- Accuracy: ${reportObj.writingMiniRubric.scores.accuracy}
- Range: ${reportObj.writingMiniRubric.scores.range}
- Total: ${reportObj.writingMiniRubric.total}/20
- Writing CEFR (rubric): ${reportObj.writingMiniRubric.suggestedCEFR}

Consistency: ${reportObj.final.consistency.label} (gap: ${reportObj.final.consistency.gap})
Decision policy: ${reportObj.meta.policy}
Weighting preset: ${reportObj.meta.weightsPreset}

FINAL RECOMMENDATION (CEFR): ${reportObj.final.cefr}
Suggested starting point: ${reportObj.programStart}

Consultant notes:
${reportObj.consultantNotes}

(Internal JSON)
${JSON.stringify(reportObj, null, 2)}
`;

    refs.output.textContent = reportText;
    refs.copyBtn.disabled = false;
    refs.sendBtn.disabled = false;

    return reportObj;
  }

  async function sendToFormspree(reportObj) {
    const endpoint = window.FORMSPREE_CONFIG?.ENDPOINT;
    if (!endpoint) throw new Error("Missing Formspree endpoint in js/formspree_config.js");

    const payload = {
      type: "final_placement",
      reference_code: reportObj.candidate.referenceCode,
      candidate_name: reportObj.candidate.name,
      candidate_email: reportObj.candidate.email,
      candidate_whatsapp: reportObj.candidate.whatsapp,

      final_cefr: reportObj.final.cefr,
      reading: reportObj.skillLevels.reading || "—",
      listening: reportObj.skillLevels.listening || "—",
      writing: reportObj.skillLevels.writing || "—",
      speaking: reportObj.skillLevels.speaking || "—",

      writing_rubric_used: reportObj.writingMiniRubric.used ? "Yes" : "No",
      writing_rubric_total: String(reportObj.writingMiniRubric.total),
      writing_rubric_cefr: reportObj.writingMiniRubric.suggestedCEFR,
      writing_rubric_scores: JSON.stringify(reportObj.writingMiniRubric.scores),

      consistency: `${reportObj.final.consistency.label} (gap: ${reportObj.final.consistency.gap})`,
      program_start: reportObj.programStart || "—",
      consultant_notes: reportObj.consultantNotes || "—",

      policy: reportObj.meta.policy,
      weights_preset: reportObj.meta.weightsPreset,
      report_json: JSON.stringify(reportObj, null, 2),
      created_at: reportObj.meta.createdAtISO
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

  // Events
  refs.computeBtn.addEventListener("click", () => compute());

  refs.copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(refs.output.textContent || "");
      refs.copyBtn.textContent = "Copied ✓";
      setTimeout(() => (refs.copyBtn.textContent = "Copy report"), 1200);
    } catch {
      alert("Could not copy automatically. You can select the report and copy manually.");
    }
  });

  refs.sendBtn.addEventListener("click", async () => {
    const report = compute();
    if (!report) return;

    refs.sendBtn.disabled = true;
    refs.sendBtn.textContent = "Sending…";
    try {
      await sendToFormspree(report);
      refs.sendBtn.textContent = "Sent ✓";
      setTimeout(() => {
        refs.sendBtn.textContent = "Send to inbox";
        refs.sendBtn.disabled = false;
      }, 1200);
    } catch (e) {
      console.error(e);
      alert("Could not send automatically. You can copy/print the report as a fallback.");
      refs.sendBtn.textContent = "Send to inbox";
      refs.sendBtn.disabled = false;
    }
  });

  refs.printBtn.addEventListener("click", () => window.print());

  // Live UI updates for writing mini-rubric
  wScoreSelects.forEach((sel) => sel.addEventListener("change", refreshWritingMiniRubricUI));
  refreshWritingMiniRubricUI();
})();
