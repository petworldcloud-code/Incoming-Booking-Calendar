import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// GitHub Pages project site: https://<org>.github.io/Incoming-Booking-Calendar/
export default defineConfig({
  base: process.env.VITE_BASE || '/Incoming-Booking-Calendar/',
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, 'index.html') }
    }
  }
});
