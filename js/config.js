// ============================================================
// IT Repository — launch config (edit these to start earning)
// ============================================================
window.IT_REPO_CONFIG = {
  // Site
  siteName: "IT Repository",
  ownerName: "Beth Sarver-Ashworth",

  // PRICE shown on site (match your Stripe Payment Link)
  priceLabel: "$12",
  pricePeriod: "/ month",
  // Or one-time: pricePeriod: " one-time"

  /**
   * STRIPE PAYMENT LINK (required to take money)
   * 1. Create free account: https://dashboard.stripe.com/register
   * 2. Products → Payment Links → New → price $12 (or one-time pack)
   * 3. After payment, redirect customers to:
   *    https://YOUR-LIVE-URL/success.html?token=CHANGE_THIS_SECRET
   * 4. Paste the Payment Link URL below:
   */
  stripePaymentLink: "",

  /**
   * Shared unlock token — must match the ?token= on your Stripe success URL.
   * Change this before you go live. Anyone with the token can unlock Pro
   * in their browser (fine for v1; upgrade to real auth later).
   */
  unlockToken: "ITPRO-BETH-2026-LAUNCH",

  // Optional: free Formspree form for waitlist/leads
  // https://formspree.io → new form → paste endpoint
  formspreeEndpoint: "",

  // Optional analytics (leave blank if none)
  // Plausible: set domain only, e.g. "it-repository.vercel.app"
  plausibleDomain: "",
};
