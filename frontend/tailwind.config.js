/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        premiumPulse: "premiumPulse 5s ease-in-out infinite",
      },
      keyframes: {
        premiumPulse: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.92 },
        },
      },
    },
  },
  plugins: [],
};
