import { defineConfig } from 'vite';

export default defineConfig({
  base: '/browser-zodiac/',
  test: {
    include: ['src/**/*.test.ts'],
  },
});
