// js/reading_engine.js
// Minimal anchor runner. Assumes you have elements with these IDs:
// #anchorTitle, #anchorText, #questions, #nextBtn, #resultBox

(function () {
  const $ = (id) => document.getElementById(id);
  const anchors = window.READING_ANCHORS;

  // storage keys (adjust to match your project)
  const STORE_KEY = "reading_results";

  let currentIndex = 0;

  function saveResults(obj) {
    localStorage.setItem(STORE_KEY, JSON.stringify(obj));
  }
  function loadResults() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch { return {}; }
  }

  function renderAnchor(anchor) {
    $("anchorTitle").textContent = `${anchor.id} • ${anchor.title}`;
    $("anchorText").textContent = anchor.text;

    const qWrap = $("questions");
    qWrap.innerHTML = "";

    anchor.questions.forEach((q, qi) => {
      const block = document.createElement("div");
      block.style.margin = "12px 0";
      block.innerHTML = `
        <div style="font-weight:650; margin-bottom:8px;">${qi + 1}) ${q.prompt}</div>
        ${q.options
          .map((opt, oi) => `
            <label style="display:block; margin:6px 0; cursor:pointer;">
              <input type="radio" name="${q.id}" value="${oi}" style="margin-right:8px;" />
              ${opt}
            </label>
          `).join("")}
      `;
      qWrap.appendChild(block);
    });

    $("resultBox").textContent = "";
  }

  function scoreAnchor(anchor) {
    let correct = 0;

    for (const q of anchor.questions) {
      const chosen = document.querySelector(`input[name="${q.id}"]:checked`);
      if (!chosen) return { error: "Please answer all questions before continuing." };
      if (parseInt(chosen.value, 10) === q.correctIndex) correct++;
    }

    return { correct, max: anchor.questions.length };
  }

  function route(anchor, correct) {
    // ceiling anchor (C1)
    if (anchor.routing?.ceiling) {
      if (correct >= anchor.routing.strongIfAtLeast) return { done: true, estimated: "C1" };
      if (correct === anchor.routing.borderlineIfEquals) return { done: true, estimated: "C1-" };
      return { done: true, estimated: anchor.routing.elseResult || "B2" };
    }

    // A2 routing (special simple rule)
    if (anchor.id === "A2") {
      if (correct >= anchor.routing.advanceIfAtLeast) return { next: "B1" };
      return { done: true, estimated: anchor.routing.stopResult || "A2" };
    }

    // B1 / B2 routing
    if (anchor.routing?.advanceIfAtLeast && correct >= anchor.routing.advanceIfAtLeast) {
      return { next: anchor.id === "B1" ? "B2" : "C1" };
    }
    if (anchor.routing?.borderlineStopIfEquals !== undefined && correct === anchor.routing.borderlineStopIfEquals) {
      return { done: true, estimated: anchor.routing.stopResultBorderline || anchor.id };
    }
    if (anchor.routing?.lowerStopIfAtMost !== undefined && correct <= anchor.routing.lowerStopIfAtMost) {
      return { done: true, estimated: anchor.routing.stopResultLower || "A2" };
    }

    // fallback
    return { done: true, estimated: anchor.id };
  }

  function findAnchorIndexById(id) {
    return anchors.findIndex(a => a.id === id);
  }

  function onNext() {
    const anchor = anchors[currentIndex];
    const scored = scoreAnchor(anchor);

    if (scored.error) {
      $("resultBox").textContent = scored.error;
      return;
    }

    const { correct, max } = scored;
    const routing = route(anchor, correct);

    // Save attempt log
    const results = loadResults();
    results.attempts = results.attempts || [];
    results.attempts.push({
      anchor: anchor.id,
      title: anchor.title,
      correct,
      max
    });

    if (routing.done) {
      results.highest_anchor = anchor.id;
      results.estimated_cefr = routing.estimated;

      saveResults(results);

      $("resultBox").textContent =
        `Reading section complete. Estimated reading level: ${routing.estimated}.`;

      // TODO: send user to next section (Listening) or your completion page
      // Example:
      // window.location.href = "listening.html";
      $("nextBtn").disabled = true;
      return;
    }

    // go next anchor
    const nextIndex = findAnchorIndexById(routing.next);
    if (nextIndex === -1) {
      $("resultBox").textContent = "Routing error: next anchor not found.";
      return;
    }

    results.highest_anchor = anchor.id;
    saveResults(results);

    currentIndex = nextIndex;
    renderAnchor(anchors[currentIndex]);
  }

  // boot
  renderAnchor(anchors[currentIndex]);
  $("nextBtn").addEventListener("click", onNext);
})();
