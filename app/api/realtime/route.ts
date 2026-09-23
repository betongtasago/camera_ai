import { NextRequest } from 'next/server'
import { subscribeToRealtime, RealtimeSyncMessage } from '@/lib/realtime'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connect frame
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'init', timestamp: Date.now() })}\n\n`))
      } catch {
        // Stream aborted immediately
        return
      }

      // Keepalive heartbeat ping every 15 seconds
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`))
        } catch {
          clearInterval(pingInterval)
        }
      }, 15000)

      // Subscribe to all mutation broadcast events
      const unsubscribe = subscribeToRealtime((msg: RealtimeSyncMessage) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`))
        } catch {
          unsubscribe()
          clearInterval(pingInterval)
        }
      })

      // Clean up when client disconnects
      req.signal.addEventListener('abort', () => {
        clearInterval(pingInterval)
        unsubscribe()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform, no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
