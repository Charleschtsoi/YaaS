/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontSize: {
        base: "18px",
        lg: "20px",
        xl: "24px",
        "2xl": "28px",
      },
      minHeight: {
        tap: "56px",
      },
      minWidth: {
        tap: "56px",
      },
    },
  },
  plugins: [],
};
