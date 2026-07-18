import { Hono } from 'hono'
import type { Env } from '../types/env'
import { success } from '../utils/response'

const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => {
  return success({ status: 'ok', environment: c.env.ENVIRONMENT })
})

export default app
