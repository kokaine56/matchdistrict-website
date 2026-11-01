import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'motion/react': 'framer-motion'
    }
  },
  server: {
    historyApiFallback: true, // serve index.html for all unknown routes (SPA routing)
    proxy: {
      '/api': {
        target: 'http://localhost:10000',
        changeOrigin: true,
        secure: false
      }
    },
    headers: {
      // Enforces TLS (HTTPS) connections strictly for 2 years
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      // Prevents the browser from guessing the content type (Firewall support)
      'X-Content-Type-Options': 'nosniff',
      // Prevents Clickjacking
      'X-Frame-Options': 'DENY',
      // Legacy XSS protection for older browsers
      'X-XSS-Protection': '1; mode=block',
      // Controls referrer information sent with requests
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    }
  },
  // Expose only the two public Supabase values used by the browser; never expose service-role keys.
  envPrefix: ['APP_', 'ENABLE_', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'VITE_'],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const source = id.replaceAll('\\', '/')
          if (source.includes('/node_modules/')) {
            if (source.includes('/react/') || source.includes('/react-dom/') || source.includes('/framer-motion/') || source.includes('/react-router')) return 'vendor'
            return 'dependencies'
          }
          if ([
            '/src/UserContext.jsx',
            '/src/ThemeContext.jsx',
            '/src/config/email.js',
            '/src/utils/defaults.js',
            '/src/components/Header.jsx',
            '/src/components/LoadingScreen.jsx'
          ].some(modulePath => source.endsWith(modulePath))) return 'auth-shared'
        }
      }
    }
  }
})
