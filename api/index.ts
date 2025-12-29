import { handle } from 'hono/vercel'
import app from '../src/server'

export const config = {
    runtime: 'edge',
}

export default handle(app)
