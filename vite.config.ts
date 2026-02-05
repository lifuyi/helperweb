import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/auth': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    plugins: [react()],
    define: {
      // Only expose public keys (VITE_ prefix)
      // NEVER expose server-only secrets like STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      // Code splitting to reduce bundle size
      rollupOptions: {
        output: {
          manualChunks: {
            'stripe': ['@stripe/stripe-js'],
            'supabase': ['@supabase/supabase-js'],
            'genai': ['@google/genai'],
          }
        }
      }
    }
  };
});
