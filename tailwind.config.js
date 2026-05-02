/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Team colors
        leneros: '#FFD700',     // amarillo
        buzos: '#1E40AF',        // azul
        brujos: '#EA580C',       // naranja
        asesinos: '#000000',     // negro
        angeles: '#FBBF24',      // amarillo dorado
        'angeles-dark': '#1E3A8A', // azul marino
        villanos: '#DC2626',     // rojo
        // PMBO brand
        'pmbo-primary': '#F97316',  // naranja basket
        'pmbo-dark': '#1F2937',
      },
    },
  },
  plugins: [],
}
