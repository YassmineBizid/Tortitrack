import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir:        'dist',
    sourcemap:     false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:   ['react','react-dom'],
          charts:   ['recharts'],
          supabase: ['@supabase/supabase-js'],
          xlsx:     ['xlsx'],
        }
      }
    }
  },
  server: {
    port: 3000,
    strictPort: false,
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify('1.0.0'),
  }
});
