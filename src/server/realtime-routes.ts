import type { Hono } from 'hono'
import { authenticatedRoomRequest, verifyJwt } from 'deepspace/worker'
import type { AppContext } from '../../worker.js'

export function registerRealtimeRoutes(app:Hono<AppContext>) {
  app.get('/ws/:roomId',async c=>{
    const roomId = c.req.param('roomId')
    if (roomId !== `app:${c.env.DEEPSPACE_APP_ID}`) return new Response('Not found',{status:404})
    const token = new URL(c.req.url).searchParams.get('token')
    const auth = token ? (await verifyJwt({
      publicKey:c.env.AUTH_JWT_PUBLIC_KEY, issuer:c.env.AUTH_JWT_ISSUER,
    },token)).result : null
    if (token && !auth) return new Response('Unauthorized',{status:401})
    const room = c.env.BOARD.get(c.env.BOARD.idFromName(roomId))
    return room.fetch(authenticatedRoomRequest(c.req.raw,auth))
  })
}
