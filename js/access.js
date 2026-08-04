(function () {
  const KEY = "it_repo_pro_unlocked";
  const KEY_AT = "it_repo_pro_unlocked_at";

  function getConfig() {
    return window.IT_REPO_CONFIG || {};
  }

  function isProUnlocked() {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  }

  function unlockPro() {
    try {
      localStorage.setItem(KEY, "1");
      localStorage.setItem(KEY_AT, new Date().toISOString());
    } catch {
      /* private mode */
    }
  }

  function lockPro() {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(KEY_AT);
    } catch {
      /* ignore */
    }
  }

  /**
   * Unlock if URL has ?token= matching config, or legacy ?pro=1 for local demo.
   */
  function tryUnlockFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || params.get("unlock");
    const cfg = getConfig();

    if (token && cfg.unlockToken && token === cfg.unlockToken) {
      unlockPro();
      return true;
    }

    // Local demo only — remove in production if you want
    if (params.get("demo_pro") === "1") {
      unlockPro();
      return true;
    }

    return false;
  }

  function getCheckoutUrl() {
    const cfg = getConfig();
    const link = (cfg.stripePaymentLink || "").trim();
    if (link) return link;
    return null;
  }

  window.ITRepoAccess = {
    isProUnlocked,
    unlockPro,
    lockPro,
    tryUnlockFromUrl,
    getCheckoutUrl,
    getConfig,
  };
})();
