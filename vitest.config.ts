import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      all: true,
      provider: 'v8',
      reporter: ['clover', 'text'],
      include: ['src/**'],
      exclude: ['**/*.config.mjs'],
      enabled: true,
    },
  },
});
