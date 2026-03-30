import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost',
      },
    },
    setupFiles: ['src/test-setup.ts'],
    poolOptions: {
      forks: {
        execArgv: ['--no-experimental-webstorage'],
      },
    },
  },
})
