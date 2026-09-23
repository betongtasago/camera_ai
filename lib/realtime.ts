import { Vehicle, CameraConfig, DetectionResult } from './types'

export type RealtimeSyncMessage =
  | { type: 'ping'; timestamp: number }
  | { type: 'init'; timestamp: number }
  | {
      type: 'vehicles_updated'
      action?: 'create' | 'update' | 'delete'
      vehicle?: Vehicle
      vehicleId?: string
      timestamp: number
    }
  | {
      type: 'cameras_updated'
      camera?: CameraConfig
      timestamp: number
    }
  | {
      type: 'log_added'
      log: DetectionResult
      timestamp: number
    }
  | {
      type: 'logs_updated'
      timestamp: number
    }
  | {
      type: 'settings_updated'
      timestamp: number
    }

type Subscriber = (msg: RealtimeSyncMessage) => void

// Global subscriber set maintained across serverless requests in the same process
const subscribers = new Set<Subscriber>()

export function subscribeToRealtime(callback: Subscriber): () => void {
  subscribers.add(callback)
  return () => {
    subscribers.delete(callback)
  }
}

export function broadcastRealtime(message: RealtimeSyncMessage) {
  for (const sub of subscribers) {
    try {
      sub(message)
    } catch {
      // Safe catch for closed stream
    }
  }
}
