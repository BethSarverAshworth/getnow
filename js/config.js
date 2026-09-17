// ============================================================
// GetNow — launch config (edit these to start earning)
// ============================================================
window.IT_REPO_CONFIG = {
  // Site
  siteName: "GetNow",
  ownerName: "Beth Sarver-Ashworth",

  // PRICE shown on site
  priceLabel: "$12.99",
  pricePeriod: " one-time",

  /**
   * Payment method: "bank" | "zelle" | "stripe" | "both"
   * bank = ACH / bank transfer to Beth's account (manual unlock).
   * stripe = automatic unlock after checkout.
   */
  paymentMethod: "bank",

  // Bank transfer (ACH) — money goes to THIS account, not Zelle
  // Fill routingNumber + accountNumber before sharing the pay page widely.
  bankName: "",
  accountHolder: "Beth Sarver-Ashworth",
  routingNumber: "",
  accountNumber: "",
  accountType: "Checking",
  paymentMemo: "GetNow Pro",

  // Optional contact after payment (email or social — NOT full phone on the public web)
  supportContact: "",

  /**
   * Live site: https://getnow-app.vercel.app/
   *
   * STRIPE PAYMENT LINK (optional later for automatic unlock)
   * Success redirect:
   *   https://getnow-app.vercel.app/success.html?token=ITPRO-BETH-2026-LAUNCH
   */
  stripePaymentLink: "",

  /**
   * After you confirm a bank payment, send the buyer this unlock link:
   *   https://getnow-app.vercel.app/success.html?token=ITPRO-BETH-2026-LAUNCH
   * Change this token if it ever leaks publicly.
   */
  unlockToken: "ITPRO-BETH-2026-LAUNCH",

  formspreeEndpoint: "",
  plausibleDomain: "",

  /**
   * SHARED FILING VAULT (optional live sync)
   *
   * The previous Supabase host ldvfjtqotlzuygcwgtai.supabase.co no longer exists
   * (DNS NXDOMAIN). Browsers then show TypeError: Failed to fetch.
   * Leave these blank so GetNow uses its own /api/chat and local vault mode.
   *
   * To restore Supabase later: new project → run vault/supabase-schema.sql →
   * Settings → API → paste Project URL + the JWT anon key (starts with eyJ).
   */
  supabaseUrl: "",
  supabaseAnonKey: "",
};
