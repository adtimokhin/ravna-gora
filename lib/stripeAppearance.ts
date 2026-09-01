import type { Appearance } from "@stripe/stripe-js";

// Shared between every Stripe Elements form on the site (checkout, payment
// method update) so they stay visually consistent.
export const STRIPE_APPEARANCE: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#153c8c",
    colorBackground: "#ffffff",
    colorText: "#000000",
    colorDanger: "#dc2626",
    // The site's Inter is self-hosted via next/font and isn't reachable from
    // Stripe's sandboxed iframe, so this falls back to the closest system
    // sans-serif rather than pulling in a second font-loading mechanism.
    fontFamily: '"Inter", system-ui, sans-serif',
    borderRadius: "0px",
  },
  rules: {
    ".Input": {
      border: "1px solid rgba(0,0,0,0.2)",
      boxShadow: "none",
      padding: "12px 16px",
    },
    ".Input:focus": {
      border: "1px solid #153c8c",
      boxShadow: "none",
    },
    ".Label": {
      color: "rgba(0,0,0,0.5)",
      fontWeight: "500",
      fontSize: "12px",
    },
  },
};
