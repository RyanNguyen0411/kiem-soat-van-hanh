import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0', // Cho phép truy cập từ điện thoại trong cùng mạng LAN/Wi-Fi
    port: 5173,
    strictPort: false,
  },
  plugins: [
    tailwindcss(),
    react(),
  ],
})
