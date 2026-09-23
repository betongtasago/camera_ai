'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { RealtimeSyncMessage } from '@/lib/realtime'
import { Vehicle, CameraConfig, DetectionResult } from '@/lib/types'

interface RealtimeSyncCallbacks {
  onVehiclesUpdated?: (event: RealtimeSyncMessage) => void
  onCamerasUpdated?: (event: RealtimeSyncMessage) => void
  onLogAdded?: (log: DetectionResult) => void
  onSettingsUpdated?: (event: Extract<RealtimeSyncMessage, { type: 'settings_updated' }>) => void
  onFullSyncRequired?: () => void
}

export function useRealtimeSync(callbacks: RealtimeSyncCallbacks = {}) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const eventSourceRef = useRef<EventSource | null>(null)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const callbacksRef = useRef(callbacks)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Keep callbacks ref updated to avoid stale closures in listeners
  useEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  // Process incoming sync message
  const handleMessage = useCallback((msg: RealtimeSyncMessage) => {
    if (!msg || typeof msg !== 'object') return

    switch (msg.type) {
      case 'ping':
        // Heartbeat received
        break

      case 'init':
        // Connection initialized
        setStatus('connected')
        break

      case 'vehicles_updated':
        callbacksRef.current.onVehiclesUpdated?.(msg)
        break

      case 'cameras_updated':
        callbacksRef.current.onCamerasUpdated?.(msg)
        break

      case 'log_added':
        if (msg.log) {
          callbacksRef.current.onLogAdded?.(msg.log)
        }
        break

      case 'logs_updated':
        callbacksRef.current.onFullSyncRequired?.()
        break

      case 'settings_updated':
        callbacksRef.current.onSettingsUpdated?.(msg)
        break

      default:
        break
    }
  }, [])

  // Send message across same-browser tabs instantly
  const broadcastLocally = useCallback((msg: RealtimeSyncMessage) => {
    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage(msg)
      }
    } catch {
      // BroadcastChannel not available or closed
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Setup BroadcastChannel for cross-tab 0ms synchronization
    if ('BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('camerai_realtime')
        broadcastChannelRef.current = bc
        bc.onmessage = (event) => {
          if (event.data) {
            handleMessage(event.data)
          }
        }
      } catch {
        // Fallback for environments where BroadcastChannel is blocked
      }
    }

    // 2. Setup Server-Sent Events (SSE) for cross-browser, cross-device real-time sync
    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      setStatus('connecting')
      const es = new EventSource('/api/realtime')
      eventSourceRef.current = es

      es.onopen = () => {
        setStatus('connected')
      }

      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as RealtimeSyncMessage
          handleMessage(parsed)
        } catch {
          // Malformed frame ignored
        }
      }

      es.onerror = () => {
        setStatus('disconnected')
        es.close()
        // Reconnect after 3 seconds
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = setTimeout(connectSSE, 3000)
      }
    }

    connectSSE()

    // 3. Re-sync whenever user returns to tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        callbacksRef.current.onFullSyncRequired?.()
      }
    }
    const handleFocus = () => {
      callbacksRef.current.onFullSyncRequired?.()
    }

    window.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close()
        broadcastChannelRef.current = null
      }
      window.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
    }
  }, [handleMessage])

  return {
    status,
    broadcastLocally,
  }
}
