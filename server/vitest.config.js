import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL || '',
      DIRECT_URL: process.env.TEST_DATABASE_URL || '',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    },
    globalSetup: './tests/globalSetup.js',
    fileParallelism: false,
  },
});
