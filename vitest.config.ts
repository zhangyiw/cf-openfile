import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          compatibilityDate: '2024-12-30',
          compatibilityFlags: ['nodejs_compat'],
          d1Databases: {
            cf_openfile_db: './.wrangler/state/v3/d1',
          },
        },
      },
    },
  },
})
