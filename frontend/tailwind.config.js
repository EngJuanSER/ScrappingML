/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
    "./pages/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
  ],
  theme: {
    extend: {
      colors: {
        mercadolibreYellow: '#FFF9C4', // Amarillo pastel
        mercadolibreOrange: '#FFD59E', // Naranja pastel
        mercadolibreWhite: '#FFFDF6', // Blanco cálido
        mercadolibreAccent: '#FFB74D', // Naranja acento
        mercadolibreSoft: '#FFF3E0', // Fondo suave
        mercadolibreText: '#B85C00', // Marrón/naranja para texto
        mercadolibreYellowStrong: '#FFE066', // Amarillo más fuerte
        // Puedes añadir más colores aquí si lo deseas
      },
    },
  },
  plugins: [],
}