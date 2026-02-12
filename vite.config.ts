import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
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
      __SUPABASE_URL__: JSON.stringify(env.VITE_SUPABASE_URL || env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''),
      __SUPABASE_ANON_KEY__: JSON.stringify(env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''),
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        // Help Vite understand React's exports
        mainFields: ['module', 'main', 'browser'],
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'stripe': ['@stripe/stripe-js'],
          }
        }
      },
    }
  };
});
