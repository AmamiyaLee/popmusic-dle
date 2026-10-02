import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build works on GitHub Pages sub-paths too.
  base: './',
  // Changes on every build, so bank.json?v=... skips stale CDN/browser caches after a deploy.
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      include: ['src/core/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/core/testSongs.ts', 'src/core/types.ts'],
    },
  },
});
