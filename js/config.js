// ============================================================
// IT Repository — launch config (edit these to start earning)
// ============================================================
window.IT_REPO_CONFIG = {
  // Site
  siteName: "IT Repository",
  ownerName: "Beth Sarver-Ashworth",

  // PRICE shown on site
  priceLabel: "$12",
  pricePeriod: " one-time",

  /**
   * Payment method: "zelle" | "stripe" | "both"
   * Zelle = QR + name (manual). Stripe = automatic unlock after checkout.
   */
  paymentMethod: "zelle",

  // Zelle (from your QR)
  zelleName: "STEVEN ASHWORTH",
  zelleNote: "IT Repository Pro",
  zelleQrImage: "./assets/zelle-qr.jpg",
  // Optional contact after payment (email or social — NOT full phone on the public web if you prefer)
  supportContact: "",

  /**
   * STRIPE PAYMENT LINK (optional later for automatic unlock)
   * Success redirect:
   *   https://it-repository-cyan.vercel.app/success.html?token=ITPRO-BETH-2026-LAUNCH
   */
  stripePaymentLink: "",

  /**
   * After you confirm a Zelle payment, send the buyer this unlock link:
   *   https://it-repository-cyan.vercel.app/success.html?token=ITPRO-BETH-2026-LAUNCH
   * Change this token if it ever leaks publicly.
   */
  unlockToken: "ITPRO-BETH-2026-LAUNCH",

  formspreeEndpoint: "",
  plausibleDomain: "",
};
