/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#e11d48', // red-600
          light: '#f43f5e', // red-500
          dark: '#be123c', // red-800
        },
        accent: {
          DEFAULT: '#e11d48', // use same as primary for accent
          light: '#f43f5e',
          dark: '#be123c',
        },
        background: {
          DEFAULT: '#dda8a1', // custom background
          dark: '#be123c', // fallback dark red
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#fbeceb',
        },
      },
    },
  },
  plugins: [],
};

