import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import type { Env } from './types/env'
import authRoutes from './routes/auth'
import roomRoutes from './routes/rooms'
import fileRoutes from './routes/files'
import healthRoutes from './routes/health'
import { deleteExpiredFiles } from './db/schema'

const app = new Hono<{ Bindings: Env }>()

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*'
      return origin
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
)

app.use(
  '*',
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
    crossOriginEmbedderPolicy: false,
  })
)

app.route('/api/auth', authRoutes)
app.route('/api/rooms', roomRoutes)
app.route('/api/files', fileRoutes)
app.route('/api/health', healthRoutes)

app.get('/api/*', (c) => {
  return c.json({ success: false, error: 'Not found' }, 404)
})

app.all('*', async (c) => {
  const asset = await c.env.ASSETS.fetch(c.req.raw)
  if (asset.status === 404) {
    const indexAsset = await c.env.ASSETS.fetch(new Request(`${new URL(c.req.url).origin}/index.html`))
    return indexAsset
  }
  return asset
})

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx)
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        const deleted = await deleteExpiredFiles(env.DB)
        console.log(`Cleanup completed: ${deleted} expired files removed`)
      })()
    )
  },
}
