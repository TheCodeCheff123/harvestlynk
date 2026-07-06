import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Load .env.test before any test file runs — this is the ONLY place
    // that should point at the test database (TEST_DATABASE_URL).
    // Never use .env here; that file holds production credentials.
    dotenv: { path: ".env.test" },
    // Guarantee NODE_ENV=test for every test run so setup.ts guard works.
    env: {
      NODE_ENV: "test",
    },
    globals: true,
    environment: "node",
    // Give slow DB tests enough headroom.
    testTimeout: 15000,
    // Run test files sequentially — they share one DB and must not race.
    fileParallelism: false,
    // Run each test file in its own worker so the global setup/teardown
    // (beforeEach cleanAll) does not bleed between suites.
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    // Global setup file that wires beforeEach/afterAll cleanup.
    setupFiles: ["./src/tests/setup.ts"],
  },
});
