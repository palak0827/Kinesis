import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@backend': path.resolve(import.meta.dirname, '../backend'),
      '@supabase/supabase-js': path.resolve(import.meta.dirname, './node_modules/@supabase/supabase-js')
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
