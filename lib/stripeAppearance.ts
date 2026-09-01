import type { Appearance, StripeElementsOptions } from "@stripe/stripe-js";

// Shared between every Stripe Elements form on the site (checkout, payment
// method update, mailing address) so they stay visually consistent — and
// consistent with the site itself: colors below are the same tokens defined
// in app/globals.css's @theme block (--color-blue-2, --color-gray-2, etc.),
// and the field styling mirrors the plain <input> classes used elsewhere
// (see LoginForm.tsx: "border border-black/20 bg-white ... focus:border-blue-2").
export const STRIPE_APPEARANCE: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#042467", // --color-blue-2
    colorBackground: "#ffffff",
    colorText: "#000000",
    colorTextSecondary: "#787878", // --color-gray-2
    colorTextPlaceholder: "#d9d9d9", // --color-gray-3
    colorDanger: "#dc2626",
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSizeBase: "16px",
    borderRadius: "0px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": {
      border: "1px solid rgba(0,0,0,0.2)",
      boxShadow: "none",
      padding: "12px 16px",
      backgroundColor: "#ffffff",
    },
    ".Input:focus": {
      border: "1px solid #042467",
      boxShadow: "none",
    },
    ".Input--invalid": {
      border: "1px solid #dc2626",
      boxShadow: "none",
    },
    ".Label": {
      color: "#787878",
      fontWeight: "700",
      fontSize: "13px",
      marginBottom: "6px",
    },
    ".Tab": {
      border: "1px solid rgba(0,0,0,0.2)",
      boxShadow: "none",
      backgroundColor: "#ffffff",
    },
    ".Tab:hover": {
      backgroundColor: "rgba(0,0,0,0.03)",
      boxShadow: "none",
    },
    ".Tab--selected": {
      border: "1px solid #042467",
      boxShadow: "none",
      backgroundColor: "rgba(4,36,103,0.04)",
    },
    ".TabIcon--selected": {
      fill: "#042467",
    },
    ".TabLabel--selected": {
      color: "#042467",
    },
    ".CheckboxInput": {
      border: "1px solid rgba(0,0,0,0.2)",
      borderRadius: "0px",
      backgroundColor: "#ffffff",
    },
    ".CheckboxInput--checked": {
      backgroundColor: "#042467",
      borderColor: "#042467",
    },
  },
};

// The site's Inter is self-hosted via next/font and isn't reachable from
// Stripe's sandboxed iframe (different origin), so `fontFamily` above alone
// falls back to a system sans-serif. Loading the same typeface from Google
// Fonts directly (a public, always-reachable URL) closes that gap without
// pulling in a second font-loading mechanism app-side.
export const STRIPE_ELEMENTS_FONTS: NonNullable<StripeElementsOptions["fonts"]> = [
  { cssSrc: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" },
];
