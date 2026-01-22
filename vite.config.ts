import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Only expose public keys (VITE_ prefix)
        // NEVER expose server-only secrets like STRIPE_SECRET_KEY, GEMINI_API_KEY
        'import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY': JSON.stringify(env.VITE_STRIPE_PUBLISHABLE_KEY),
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
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
