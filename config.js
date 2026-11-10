// Owner settings for site-v2 / v3 (INTERNAL DRAFT).
window.PREORDER_CONFIG = {
  COMPANY_NAME: "Corrimar",                  // Cesar chose 2026-10-26 (attorney check pending)
  PRODUCT_NAME: "Corrimar tallow balm",
  BATCH_LABEL: "Batch 01",
  PAGE_URL: "https://PLACEHOLDER.ex/",       // PLACEHOLDER: no host or domain chosen yet
  QR_URL: "https://PLACEHOLDER.ex/s",        // PLACEHOLDER: short path printed on the sample lid; /s redirects to /?src=sample
  CONTACT_EMAIL: "preorders.tallow@gmail.com",
  TARGET: 100,            // PLACEHOLDER: smallest batch production will accept, Cesar sets
  MAX_PER_ORDER: 3,       // Up to three per person
  COUNT_MODE: "units",    // "units" = sum of quantities, "entries" = number of sign-ups
  BACKEND: "local",       // Draft: localStorage only. No real backend wired.
  SHOW_LIVE_COUNT: false, // Keep false until a shared backend holds real reservations. true shows "X of N reserved" + bar.
  STORAGE_KEY: "corrimar.v2.batch01.entries",
  WAITLIST_KEY: "corrimar.v2.batch01.waitlist",
  SOURCE_KEY: "corrimar.v2.src",
  SAMPLE_SOURCES: ["sample"], // ?src=sample (or /s) greets people who scanned a sample lid
  SHOW_DEMO_PANEL: false
};
