import { handle } from 'hono/vercel'
import app from '../src/server'

export const config = {
    runtime: 'nodejs',
}

export default handle(app)
