// js/guards.js
// Reusable guards for our diagnostic flow (serverless).

(function () {
  /**
   * Require login gate to be passed (Step 2).
   */
  window.requireAccess = function requireAccess() {
    const granted = sessionStorage.getItem("diagnostic_access_granted") === "true";
    if (!granted) {
      window.location.replace("login.html");
      return false;
    }
    return true;
  };

  /**
   * Require candidate information to be completed (Step 3).
   */
  window.requireCandidate = function requireCandidate() {
    if (!window.requireAccess()) return false;
    const candidate = sessionStorage.getItem("diagnostic_candidate");
    if (!candidate) {
      window.location.replace("candidate.html");
      return false;
    }
    return true;
  };

  /**
   * Optional: mark current stage (for analytics / debugging).
   */
  window.setStage = function setStage(stageName) {
    sessionStorage.setItem("diagnostic_stage", stageName);
  };
})();
