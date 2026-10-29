import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = process.env.VITE_API_URL || env.VITE_API_URL;

  if (mode === 'production' && !apiUrl) {
    throw new Error('Set VITE_API_URL to your deployed backend URL, including /api, before building for production.');
  }

  return { plugins: [react()] };
});
