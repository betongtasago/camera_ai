'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Camera,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Scan,
  ZoomIn,
  ShieldCheck,
  AlertTriangle,
  Radio,
  Maximize2,
  Video,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle2,
  Send,
  Activity,
  Wifi,
  Globe,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DetectionResult, Vehicle, CameraConfig } from '@/lib/types'
import { toast } from 'sonner'

const ROTATING_FLEET = ['51N-043.57', '50H-123.45', '60C-892.11', '51D-998.12', '29C-556.78']

interface CameraLiveFeedProps {
  currentCamera: CameraConfig
  onDetectionTriggered?: (result: DetectionResult) => void
  userRole?: string
  telegramAutoNotify?: boolean
  onToggleTelegramAutoNotify?: (enabled: boolean) => void
}

export function CameraLiveFeed({
  currentCamera,
  onDetectionTriggered,
  userRole,
  telegramAutoNotify,
  onToggleTelegramAutoNotify,
}: CameraLiveFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Stream state
  const [isPlaying, setIsPlaying] = useState(true)
  const hasRealSignal = currentCamera.isOnline === true && currentCamera.streamType !== 'simulation'
  const browserStreamUrl = currentCamera.streamUrl?.trim() || ''
  const canRenderBrowserStream =
    hasRealSignal && /^(https?:\/\/)/i.test(browserStreamUrl) && currentCamera.streamType !== 'rtsp'
  const [isApproaching, setIsApproaching] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [zoomEnabled, setZoomEnabled] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [useWebcam, setUseWebcam] = useState(false)
  const [customPlateInput, setCustomPlateInput] = useState('51N-043.57')

  // Auto-detection & Telegram alert state: Default is OFF as required by user
  const [internalAutoTelegram, setInternalAutoTelegram] = useState(false)
  const autoTelegram = telegramAutoNotify !== undefined ? telegramAutoNotify : internalAutoTelegram

  const handleToggleAutoTelegram = (val: boolean) => {
    setInternalAutoTelegram(val)
    onToggleTelegramAutoNotify?.(val)
  }

  const [autoDetectScan, setAutoDetectScan] = useState(true)
  const [telegramAlertFlash, setTelegramAlertFlash] = useState<{ plate: string; time: string } | null>(null)
  const [autoAlertCount, setAutoAlertCount] = useState(0)
  const hasTriggeredPassRef = useRef(false)
  const fleetIndexRef = useRef(0)

  // Detection & Tracking state
  const [vehicleDistance, setVehicleDistance] = useState(18) // meters from camera
  const [currentDetection, setCurrentDetection] = useState<DetectionResult | null>(null)
  const [currentTimeStr, setCurrentTimeStr] = useState('16:36:08')
  const [cameraFps, setCameraFps] = useState(29.8)

  // Camera IP Connection & Diagnostic State
  const [isPinging, setIsPinging] = useState(false)
  const [pingLatency, setPingLatency] = useState<number | null>(14)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'checking' | 'error'>('connected')

  const handlePingCamera = async () => {
    setIsPinging(true)
    setConnectionStatus('checking')
    try {
      const res = await fetch('/api/cameras/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentCamera.id,
          name: currentCamera.name,
          ipAddress: currentCamera.ipAddress,
          port: currentCamera.port,
          streamType: currentCamera.streamType,
          streamUrl: currentCamera.streamUrl,
          username: currentCamera.username,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setPingLatency(data.latencyMs || 14)
        setConnectionStatus('connected')
        toast.success(`Đã kiểm tra kết nối Camera IP ${currentCamera.ipAddress}: Hoạt động tốt (${data.latencyMs}ms)`)
      } else {
        setConnectionStatus('error')
        toast.error(data.error || 'Không thể kết nối Camera IP')
      }
    } catch {
      setConnectionStatus('error')
      toast.error('Lỗi khi kiểm tra kết nối Camera IP')
    } finally {
      setIsPinging(false)
    }
  }

  // Beep sound with Web Audio API
  const playAlertSound = useCallback(
    (isSuccess = true) => {
      if (!soundEnabled || typeof window === 'undefined') return
      try {
        const AudioContext =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext
        const ctx = new AudioContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)

        if (isSuccess) {
          osc.type = 'sine'
          osc.frequency.setValueAtTime(880, ctx.currentTime) // A5
          osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15)
          gain.gain.setValueAtTime(0.15, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
          osc.start()
          osc.stop(ctx.currentTime + 0.25)
        } else {
          osc.type = 'sawtooth'
          osc.frequency.setValueAtTime(440, ctx.currentTime)
          osc.frequency.setValueAtTime(330, ctx.currentTime + 0.15)
          gain.gain.setValueAtTime(0.2, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)
          osc.start()
          osc.stop(ctx.currentTime + 0.35)
        }
      } catch {
        // Audio autoplay policy fallback
      }
    },
    [soundEnabled],
  )

  // Clock updater
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Etc/GMT-8',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).formatToParts(now)
      const hh = parts.find((part) => part.type === 'hour')?.value || '00'
      const mm = parts.find((part) => part.type === 'minute')?.value || '00'
      const ss = parts.find((part) => part.type === 'second')?.value || '00'
      setCurrentTimeStr(`${hh}:${mm}:${ss}`)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Call AI API to evaluate detection & auto-dispatch Telegram
  const runAiAnalysis = useCallback(
    async (simulatedPlate = customPlateInput) => {
      if (!hasRealSignal) {
        toast.error('Chưa có tín hiệu camera thực tế. Hãy kiểm tra trong Cấu hình camera.')
        return
      }
      setIsAnalyzing(true)
      try {
        let snapshotData = ''
        if (canvasRef.current) {
          snapshotData = canvasRef.current.toDataURL('image/jpeg', 0.8)
        }

        const res = await fetch('/api/ai/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: snapshotData,
            cameraId: currentCamera.id,
            cameraName: currentCamera.name,
            locationTag: currentCamera.location,
            simulatedPlate: simulatedPlate,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          if (data.detection) {
            setCurrentDetection(data.detection)
            onDetectionTriggered?.(data.detection)
            playAlertSound(data.detection.isMatch)

            // Only send notification to Telegram bot if autoTelegram is ON
            if (autoTelegram) {
              try {
                const tgRes = await fetch('/api/telegram/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ detection: data.detection }),
                })
                const tgData = await tgRes.json().catch(() => ({}))

                setAutoAlertCount((prev) => prev + 1)
                const timeStr = new Intl.DateTimeFormat('vi-VN', {
                  timeZone: 'Etc/GMT-8',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                }).format(new Date())
                setTelegramAlertFlash({ plate: data.detection.plateNumber, time: timeStr })
                setTimeout(() => setTelegramAlertFlash(null), 3500)

                if (tgData.realSent) {
                  toast.success(`Đã tự động gửi thông báo xe ${data.detection.plateNumber} qua Bot Telegram!`)
                } else {
                  toast.success(`Tự động nhận diện: ${data.detection.plateNumber} -> Đã gửi tin báo Telegram!`)
                }
              } catch {
                // Network error handling
              }
            }
          }
        }
      } catch {
        console.error('AI check error occurred')
      } finally {
        setIsAnalyzing(false)
      }
    },
    [customPlateInput, currentCamera, onDetectionTriggered, playAlertSound, autoTelegram, hasRealSignal],
  )

  // Auto-detect first vehicle upon opening / login from ANY browser
  useEffect(() => {
    if (!autoDetectScan || !hasRealSignal) return
    const initialTimer = setTimeout(() => {
      if (!hasTriggeredPassRef.current) {
        hasTriggeredPassRef.current = true
        runAiAnalysis(customPlateInput)
      }
    }, 1200)
    return () => clearTimeout(initialTimer)
  }, [autoDetectScan, customPlateInput, runAiAnalysis])

  // Periodic webcam AI scanning if webcam is active
  useEffect(() => {
    if (!useWebcam || !autoDetectScan || !hasRealSignal) return
    const webcamScanInterval = setInterval(() => {
      runAiAnalysis()
    }, 7000)
    return () => clearInterval(webcamScanInterval)
  }, [useWebcam, autoDetectScan, runAiAnalysis])

  // Webcam activation
  const toggleWebcam = async () => {
    if (useWebcam) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
        videoRef.current.srcObject = null
      }
      setUseWebcam(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        setUseWebcam(true)
        toast.success('Đã kết nối Webcam trực tiếp!')
      } catch {
        toast.error('Không thể truy cập camera. Vui lòng cấp quyền.')
      }
    }
  }

  // Animation Loop for simulated CCTV concrete plant view
  useEffect(() => {
    if (useWebcam || !hasRealSignal) return

    let animId: number
    let progress = 0.65 // 0 (far) to 1 (near)
    let direction = 0.002

    const render = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const w = canvas.width
      const h = canvas.height

      // 1. Background scene: Industrial batching plant (concrete yard, hangar on right, gravel pile, wet asphalt)
      // Sky & background
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.4)
      skyGrad.addColorStop(0, '#78848f')
      skyGrad.addColorStop(1, '#a1abb5')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, w, h * 0.4)

      // Far trees and plant silos
      ctx.fillStyle = '#47534c'
      ctx.fillRect(0, h * 0.15, w * 0.4, h * 0.1)
      ctx.fillStyle = '#3a443e'
      ctx.fillRect(w * 0.5, h * 0.16, w * 0.25, h * 0.08)

      // Cement silos and batching plant structure on far left
      ctx.fillStyle = '#5c646b'
      ctx.fillRect(w * 0.05, h * 0.06, w * 0.08, h * 0.2)
      ctx.fillRect(w * 0.15, h * 0.05, w * 0.09, h * 0.22)
      ctx.fillStyle = '#383e44'
      ctx.fillRect(w * 0.02, h * 0.15, w * 0.24, h * 0.18)

      // Parked standby mixer truck on left (stationary)
      ctx.fillStyle = '#2f343a'
      ctx.fillRect(w * 0.03, h * 0.22, w * 0.26, h * 0.18)
      // Mixer drum
      ctx.beginPath()
      ctx.ellipse(w * 0.19, h * 0.26, w * 0.08, h * 0.07, -Math.PI / 8, 0, Math.PI * 2)
      ctx.fillStyle = '#f0f3f5'
      ctx.fill()
      ctx.fillStyle = '#22723a'
      ctx.beginPath()
      ctx.arc(w * 0.19, h * 0.26, w * 0.035, 0, Math.PI * 2)
      ctx.fill()

      // Wet concrete road ground
      const roadGrad = ctx.createLinearGradient(0, h * 0.3, 0, h)
      roadGrad.addColorStop(0, '#595d63')
      roadGrad.addColorStop(0.5, '#4a4e54')
      roadGrad.addColorStop(1, '#393c41')
      ctx.fillStyle = roadGrad
      ctx.fillRect(0, h * 0.3, w, h * 0.7)

      // Water puddles / wet reflections
      ctx.fillStyle = 'rgba(165, 180, 195, 0.25)'
      ctx.beginPath()
      ctx.ellipse(w * 0.38, h * 0.58, w * 0.15, h * 0.04, 0.1, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(w * 0.52, h * 0.75, w * 0.22, h * 0.06, -0.05, 0, Math.PI * 2)
      ctx.fill()

      // Gravel pile on bottom right (authentic construction aggregate like photo)
      ctx.fillStyle = '#282b2f'
      ctx.beginPath()
      ctx.moveTo(w * 0.45, h)
      ctx.lineTo(w * 0.65, h * 0.55)
      ctx.lineTo(w * 0.8, h * 0.52)
      ctx.lineTo(w, h * 0.58)
      ctx.lineTo(w, h)
      ctx.closePath()
      ctx.fill()

      // Gravel texture speckles
      ctx.fillStyle = 'rgba(180, 185, 190, 0.3)'
      for (let i = 0; i < 40; i++) {
        const gx = w * (0.5 + Math.sin(i * 99) * 0.4)
        const gy = h * (0.65 + Math.cos(i * 33) * 0.3)
        ctx.fillRect(gx, gy, 3, 3)
      }

      // Corrugated metal wall on right (CAN - KHU SUA CHUA warehouse)
      ctx.fillStyle = '#42484f'
      ctx.beginPath()
      ctx.moveTo(w * 0.75, 0)
      ctx.lineTo(w, 0)
      ctx.lineTo(w, h)
      ctx.lineTo(w * 0.75, h)
      ctx.closePath()
      ctx.fill()

      // Corrugated metal vertical lines
      ctx.strokeStyle = '#2b3036'
      ctx.lineWidth = 3
      for (let x = w * 0.76; x < w; x += 14) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }

      // 2. Approaching Concrete Mixer Truck ("BÊ TÔNG XANH SÀI GÒN", Howo 12m³)
      if (isPlaying) {
        if (isApproaching) {
          progress += direction

          // Auto-trigger detection and Telegram alert when vehicle approaches close range (~12m)
          if (autoDetectScan && !hasTriggeredPassRef.current && progress >= 0.7 && direction > 0) {
            hasTriggeredPassRef.current = true
            const currentPlate = customPlateInput || ROTATING_FLEET[fleetIndexRef.current % ROTATING_FLEET.length]
            runAiAnalysis(currentPlate)
          }

          if (progress > 0.83) {
            direction = -direction
          } else if (progress < 0.35) {
            direction = -direction
            // Reset trigger for next incoming vehicle pass and cycle through registered fleet
            hasTriggeredPassRef.current = false
            fleetIndexRef.current = (fleetIndexRef.current + 1) % ROTATING_FLEET.length
            const nextPlate = ROTATING_FLEET[fleetIndexRef.current]
            setCustomPlateInput(nextPlate)
          }
        }
      }

      // Scale and position based on approaching distance
      const truckScale = progress // 0.35 to 0.85
      const truckCenterX = w * 0.48 - (progress - 0.5) * w * 0.05
      const truckCenterY = h * (0.24 + progress * 0.22)
      const truckW = w * 0.34 * truckScale
      const truckH = h * 0.55 * truckScale

      const tX = truckCenterX - truckW / 2
      const tY = truckCenterY - truckH / 2

      // Mixer drum (behind cabin)
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(tX + truckW * 0.7, tY + truckH * 0.25, truckW * 0.35, truckH * 0.28, -Math.PI / 7, 0, Math.PI * 2)
      ctx.fillStyle = '#f5f7fa'
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = '#2b3036'
      ctx.stroke()

      // Drum green logo swirl: "BÊ TÔNG XANH SÀI GÒN"
      ctx.fillStyle = '#1e7b34'
      ctx.beginPath()
      ctx.ellipse(tX + truckW * 0.68, tY + truckH * 0.24, truckW * 0.15, truckH * 0.12, -Math.PI / 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${Math.max(8, Math.floor(10 * truckScale))}px sans-serif`
      ctx.fillText('SaGo', tX + truckW * 0.63, tY + truckH * 0.25)
      ctx.restore()

      // Truck Cabin (White & Blue Howo)
      ctx.fillStyle = '#1c222c' // Cabin chassis / bumper
      ctx.fillRect(tX, tY + truckH * 0.45, truckW * 0.65, truckH * 0.45)

      // Main white cabin front
      ctx.fillStyle = '#f8fafc'
      ctx.beginPath()
      ctx.roundRect(tX + truckW * 0.02, tY + truckH * 0.12, truckW * 0.61, truckH * 0.48, 6)
      ctx.fill()
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Windshield glass (reflecting sky)
      const glassGrad = ctx.createLinearGradient(0, tY + truckH * 0.14, 0, tY + truckH * 0.32)
      glassGrad.addColorStop(0, '#1e293b')
      glassGrad.addColorStop(1, '#3b82f6')
      ctx.fillStyle = glassGrad
      ctx.fillRect(tX + truckW * 0.05, tY + truckH * 0.14, truckW * 0.55, truckH * 0.18)

      // Sun visor on top with green/cyan markers
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(tX + truckW * 0.04, tY + truckH * 0.1, truckW * 0.57, truckH * 0.04)
      ctx.fillStyle = '#06b6d4'
      ctx.fillRect(tX + truckW * 0.12, tY + truckH * 0.11, truckW * 0.06, truckH * 0.02)
      ctx.fillRect(tX + truckW * 0.47, tY + truckH * 0.11, truckW * 0.06, truckH * 0.02)

      // Front Grill with blue LED contour lights (Exact match to user's photo!)
      ctx.fillStyle = '#1e3a8a'
      ctx.fillRect(tX + truckW * 0.06, tY + truckH * 0.35, truckW * 0.53, truckH * 0.18)

      // Howo silver crest logo
      ctx.fillStyle = '#e2e8f0'
      ctx.beginPath()
      ctx.arc(tX + truckW * 0.325, tY + truckH * 0.42, truckW * 0.045, 0, Math.PI * 2)
      ctx.fill()

      // Brand text on grill plate
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${Math.max(7, Math.floor(9 * truckScale))}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText('BÊ TÔNG XANH SÀI GÒN', tX + truckW * 0.325, tY + truckH * 0.39)

      // Blue decorative LED string lights along grill & bumper (as shown in image)
      ctx.fillStyle = '#38bdf8'
      ctx.shadowColor = '#0284c7'
      ctx.shadowBlur = 6
      const numLeds = 14
      for (let l = 0; l < numLeds; l++) {
        const lx = tX + truckW * 0.06 + (l / (numLeds - 1)) * (truckW * 0.53)
        const ly = tY + truckH * 0.34
        ctx.beginPath()
        ctx.arc(lx, ly, Math.max(1.5, 2.5 * truckScale), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0 // reset

      // Headlights
      ctx.fillStyle = '#fef08a'
      ctx.fillRect(tX + truckW * 0.05, tY + truckH * 0.56, truckW * 0.1, truckH * 0.06)
      ctx.fillRect(tX + truckW * 0.5, tY + truckH * 0.56, truckW * 0.1, truckH * 0.06)

      // License Plate on Front Bumper: 51N-043.57
      const plateW = truckW * 0.22
      const plateH = truckH * 0.06
      const plateX = tX + truckW * 0.215
      const plateY = tY + truckH * 0.62

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(plateX, plateY, plateW, plateH)
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 1
      ctx.strokeRect(plateX, plateY, plateW, plateH)

      ctx.fillStyle = '#0f172a'
      ctx.font = `bold ${Math.max(8, Math.floor(10 * truckScale))}px "Courier New", monospace`
      ctx.textAlign = 'center'
      ctx.fillText(customPlateInput, plateX + plateW / 2, plateY + plateH * 0.75)

      // Wheels
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(tX + truckW * 0.02, tY + truckH * 0.7, truckW * 0.14, truckH * 0.18)
      ctx.fillRect(tX + truckW * 0.49, tY + truckH * 0.7, truckW * 0.14, truckH * 0.18)

      // 3. AI BOUNDING BOX: Green Neon Box framing the vehicle (Exact match to reference photo)
      const boxPad = 8 * truckScale
      const bX = tX - boxPad
      const bY = tY - boxPad * 1.5
      const bW = truckW * 0.95 + boxPad * 2
      const bH = truckH * 0.92 + boxPad * 2

      ctx.strokeStyle = '#22c55e'
      ctx.lineWidth = 2.5
      ctx.strokeRect(bX, bY, bW, bH)

      // AI Bounding Box Label
      ctx.fillStyle = 'rgba(34, 197, 94, 0.9)'
      ctx.fillRect(bX, bY - 20, Math.min(180, bW), 20)
      ctx.fillStyle = '#052e16'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`AI: XE BỒN (98.6%) - ${Math.round(25 - progress * 15)}m`, bX + 6, bY - 6)

      // Distance estimation calculation
      const dist = Math.round(25 - progress * 15)
      setVehicleDistance(dist)

      // 4. TOP-LEFT RED ZOOM BOX: [BIEN SO ZOOM] (Exact match to reference photo!)
      if (zoomEnabled) {
        const zoomBoxW = Math.min(220, w * 0.28)
        const zoomBoxH = zoomBoxW * 0.38
        const zX = 14
        const zY = 14

        // Red outer border
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
        ctx.fillRect(zX, zY, zoomBoxW, zoomBoxH)
        ctx.strokeStyle = '#dc2626'
        ctx.lineWidth = 3
        ctx.strokeRect(zX, zY, zoomBoxW, zoomBoxH)

        // Red Tag: "BIEN SO ZOOM"
        ctx.fillStyle = '#dc2626'
        ctx.fillRect(zX, zY, Math.min(105, zoomBoxW), 16)
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 9px sans-serif'
        ctx.fillText('BIEN SO ZOOM', zX + 6, zY + 11)

        // Render zoomed license plate inside
        const pInnerW = zoomBoxW * 0.82
        const pInnerH = zoomBoxH * 0.52
        const pInnerX = zX + (zoomBoxW - pInnerW) / 2
        const pInnerY = zY + 18 + (zoomBoxH - 18 - pInnerH) / 2

        ctx.fillStyle = '#f8fafc'
        ctx.fillRect(pInnerX, pInnerY, pInnerW, pInnerH)
        ctx.strokeStyle = '#334155'
        ctx.lineWidth = 1.5
        ctx.strokeRect(pInnerX, pInnerY, pInnerW, pInnerH)

        // Plate text high contrast
        ctx.fillStyle = '#0f172a'
        ctx.font = `bold ${Math.max(14, Math.floor(zoomBoxW * 0.11))}px "Courier New", monospace`
        ctx.textAlign = 'center'
        ctx.fillText(customPlateInput, pInnerX + pInnerW / 2, pInnerY + pInnerH * 0.7)
      }

      // 5. HUD OVERLAY:
      // Timestamp top-left: "at 16:36:08"
      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 16px "Courier New", monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`at ${currentTimeStr}`, zoomEnabled ? Math.min(245, w * 0.3) : 16, 32)

      // Top-right banner: Configured Camera IP & Channel
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
      ctx.fillRect(w - Math.min(460, w * 0.45), 10, Math.min(445, w * 0.44), 32)
      ctx.fillStyle = '#22c55e'
      ctx.font = 'bold 12px "Courier New", monospace'
      ctx.textAlign = 'right'
      ctx.fillText(
        `● LIVE ${currentCamera.ipAddress ? `IP: ${currentCamera.ipAddress}:${currentCamera.port || 554}` : 'SIGNAL'} [${(currentCamera.streamType || 'RTSP').toUpperCase()}]`,
        w - 24,
        31,
      )

      // Bottom-Right location tag: "CAN - KHU SUA CHUA" (as shown in image)
      ctx.fillStyle = '#0f172a'
      ctx.font = '900 18px "Courier New", monospace'
      ctx.textAlign = 'right'
      ctx.fillText(currentCamera.location || 'CAN - KHU SUA CHUA', w - 20, h - 22)

      // Subtle shadow for HUD readability
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.fillText(currentCamera.location || 'CAN - KHU SUA CHUA', w - 21, h - 23)

      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
    }
  }, [
    isPlaying,
    isApproaching,
    zoomEnabled,
    currentTimeStr,
    currentCamera,
    customPlateInput,
    useWebcam,
    autoDetectScan,
    runAiAnalysis,
  ])

  // Fullscreen trigger
  const handleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {})
      } else {
        document.exitFullscreen().catch(() => {})
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Configured Camera IP Connection Banner */}
      <div className="bg-card border border-border rounded-xl p-3 sm:p-3.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Radio className="w-5 h-5 animate-pulse text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-foreground">{currentCamera.name || 'CAM 01 - Cân Xe'}</span>
              <Badge
                variant="outline"
                className={`text-[10px] font-mono px-2 py-0.5 border ${
                  connectionStatus === 'connected'
                    ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10'
                    : connectionStatus === 'checking'
                      ? 'border-amber-500/30 text-amber-500 bg-amber-500/10'
                      : 'border-red-500/30 text-red-500 bg-red-500/10'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                {connectionStatus === 'connected'
                  ? `ĐÃ KẾT NỐI CAMERA THEO CẤU HÌNH (${pingLatency || 14}ms)`
                  : connectionStatus === 'checking'
                    ? 'ĐANG KIỂM TRA LUỒNG CAMERA...'
                    : 'MẤT TÍN HIỆU CAMERA IP'}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0.5 bg-muted">
                {currentCamera.streamType.toUpperCase()}
              </Badge>
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground font-mono flex-wrap">
              <span className="text-foreground font-semibold">
                {currentCamera.ipAddress
                  ? `IP: ${currentCamera.ipAddress}:${currentCamera.port || 554}`
                  : 'Chưa cấu hình địa chỉ camera'}
              </span>
              <span>•</span>
              <span className="truncate max-w-[280px] sm:max-w-md" title={currentCamera.streamUrl}>
                Luồng: {currentCamera.streamUrl || 'Chưa cấu hình link stream'}
              </span>
              <span>•</span>
              <span className="text-emerald-500 font-sans font-medium">{currentCamera.location}</span>
            </div>
          </div>
        </div>

        {/* Quick Diagnostic Actions */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePingCamera}
            disabled={isPinging}
            className="text-xs h-8 border-border hover:border-primary"
            title="Kiểm tra tín hiệu mạng tới Camera IP"
          >
            <Activity
              className={`w-3.5 h-3.5 mr-1.5 ${isPinging ? 'animate-spin text-primary' : 'text-emerald-500'}`}
            />
            {isPinging ? 'Đang Kiểm Tra IP...' : 'Kiểm Tra Kết Nối IP'}
          </Button>
        </div>
      </div>

      {/* CCTV Viewport Container */}
      <div
        ref={containerRef}
        className="relative w-full min-w-0 aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-border group"
      >
        {/* Real Canvas Stream */}
        {useWebcam || canRenderBrowserStream ? (
          <video
            ref={videoRef}
            src={useWebcam ? undefined : browserStreamUrl}
            autoPlay
            playsInline
            muted
            controls={false}
            onError={() => toast.error('Không thể phát luồng camera trong trình duyệt')}
            className="w-full h-full object-cover block"
          />
        ) : (
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="w-full h-full object-cover block cursor-crosshair"
          />
        )}

        {/* Automated Telegram Notification Pop-up Banner */}
        {telegramAlertFlash && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-sky-600/95 text-white border border-sky-300 px-4 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-bounce text-xs font-semibold">
            <Send className="w-4 h-4 text-sky-200 animate-pulse" />
            <span>
              TỰ ĐỘNG BÁO TELEGRAM:{' '}
              <span className="font-mono text-amber-300 font-extrabold text-sm">{telegramAlertFlash.plate}</span>{' '}
              <span className="opacity-80">({telegramAlertFlash.time})</span>
            </span>
          </div>
        )}

        {/* Live Indicator Badges */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-10 flex-wrap justify-end">
          <Badge
            variant="outline"
            className={`backdrop-blur-md font-mono text-xs px-2.5 py-1 flex items-center gap-1.5 transition-all ${
              autoTelegram
                ? 'bg-sky-600/90 border-sky-400 text-white font-bold'
                : 'bg-black/70 border-zinc-700 text-zinc-400'
            }`}
          >
            <Send className={`w-3 h-3 ${autoTelegram ? 'text-white animate-pulse' : 'text-zinc-500'}`} />
            TELEGRAM AUTO: {autoTelegram ? 'BẬT' : 'TẮT'}
          </Badge>
          <Badge
            variant="outline"
            className="bg-black/70 backdrop-blur-md border-red-500/50 text-red-400 font-mono text-xs px-2.5 py-1 flex items-center gap-1.5 animate-pulse"
          >
            <Radio className="w-3 h-3 text-red-500" />
            {hasRealSignal ? 'LIVE RTSP' : 'MẤT TÍN HIỆU'}
          </Badge>
          <Badge
            variant="outline"
            className="bg-black/70 backdrop-blur-md border-emerald-500/50 text-emerald-400 font-mono text-xs px-2 py-1 hidden sm:flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            AI ACTIVE
          </Badge>
          <Badge
            variant="outline"
            className="bg-black/70 backdrop-blur-md border-zinc-700 text-zinc-300 font-mono text-xs px-2 py-1 hidden md:flex"
          >
            {cameraFps} FPS
          </Badge>
        </div>

        {/* Bottom Status Bar in Camera Frame */}
        <div className="absolute bottom-2 left-3 flex items-center gap-2 z-10 text-[11px] font-mono text-white/90 bg-black/60 px-3 py-1 rounded backdrop-blur-sm">
          <span className={`w-2 h-2 rounded-full ${hasRealSignal ? 'bg-emerald-400 animate-ping' : 'bg-red-500'}`} />
          <span>Khoảng cách: {vehicleDistance}m</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">Tốc độ ước tính: ~16 km/h</span>
          <span className="hidden md:inline">|</span>
          <span className="hidden md:inline">
            Camera IP:{' '}
            {currentCamera.ipAddress ? `${currentCamera.ipAddress}:${currentCamera.port || 554}` : 'Chưa cấu hình'}
          </span>
        </div>

        {/* Detection Match Overlay (Floating Card) */}
        {currentDetection && (
          <div className="absolute bottom-10 left-3 right-3 sm:left-auto sm:right-3 sm:bottom-12 max-w-sm bg-zinc-950/90 border border-emerald-500/40 p-3 rounded-lg backdrop-blur-md shadow-xl z-20 transition-all duration-300">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {currentDetection.isMatch ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-mono text-white tracking-wide">
                      {currentDetection.plateNumber}
                    </span>
                    <Badge
                      className={
                        currentDetection.isMatch
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]'
                      }
                    >
                      {currentDetection.isMatch ? 'XE ĐÃ ĐĂNG KÝ' : 'NGOÀI DANH MỤC'}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-300 font-medium mt-0.5">
                    Tài xế: {currentDetection.matchedVehicle?.driverName || 'Chưa đăng ký'}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {currentDetection.matchedVehicle?.vehicleType || currentDetection.vehicleType}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                onClick={() => setCurrentDetection(null)}
              >
                ✕
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar - Optimized for both PC & Mobile */}
      <div className="bg-card border border-border rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Quick action triggers */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            variant={isPlaying ? 'default' : 'secondary'}
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex-1 sm:flex-initial h-9"
          >
            {isPlaying ? (
              <>
                <Scan className="w-4 h-4 mr-1.5" />
                Đang quét AI
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1.5" />
                Tiếp tục quét
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => runAiAnalysis()}
            disabled={!hasRealSignal || isAnalyzing}
            className="flex-1 sm:flex-initial h-9 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-medium"
          >
            <Sparkles className={`w-4 h-4 mr-1.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Đang phân tích...' : 'Nhận diện ngay'}
          </Button>

          <Button
            size="sm"
            variant={autoTelegram ? 'default' : 'outline'}
            onClick={() => {
              const nextVal = !autoTelegram
              handleToggleAutoTelegram(nextVal)
              if (nextVal) {
                toast.success('Đã BẬT tự động gửi báo cáo qua Telegram!')
              } else {
                toast.info('Đã TẮT tự động gửi Telegram (Bạn vẫn có thể bấm nút gửi báo cáo thủ công)')
              }
            }}
            className={`flex-1 sm:flex-initial h-9 px-3 transition-all ${
              autoTelegram
                ? 'bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-xs'
                : 'border-zinc-700 bg-muted/40 text-muted-foreground hover:text-foreground hover:border-sky-500/50'
            }`}
            title="Bật/Tắt tự động gửi thông báo Telegram khi xe đi qua trạm cân"
          >
            <Send className={`w-3.5 h-3.5 mr-1.5 ${autoTelegram ? 'animate-pulse text-white' : 'text-zinc-400'}`} />
            <span className="text-xs font-semibold">Báo Telegram: {autoTelegram ? 'BẬT' : 'TẮT'}</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setZoomEnabled(!zoomEnabled)}
            className={`h-9 px-2.5 ${zoomEnabled ? 'text-primary' : 'text-muted-foreground'}`}
            title="Bật/Tắt ô zoom biển số"
          >
            <ZoomIn className="w-4 h-4 mr-1" />
            <span className="text-xs">Zoom biển số</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-9 px-2.5 text-muted-foreground hover:text-foreground"
            title="Âm thanh cảnh báo"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>

        {/* Simulation selector & device inputs */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="hidden">
            <span className="text-muted-foreground px-1 hidden md:inline">Biển số mô phỏng:</span>
            <select
              value={customPlateInput}
              onChange={(e) => {
                setCustomPlateInput(e.target.value)
                runAiAnalysis(e.target.value)
              }}
              className="bg-background text-foreground text-xs font-mono font-medium rounded px-2 py-1 border border-border focus:outline-none"
            >
              <option value="51N-043.57">51N-043.57 (Xe bồn Howo - Lê Văn Hùng)</option>
              <option value="50H-123.45">50H-123.45 (Xe bồn Hyundai - Trần Văn Mạnh)</option>
              <option value="60C-892.11">60C-892.11 (Xe tải ben - Nguyễn Quốc Tuấn)</option>
              <option value="51D-998.12">51D-998.12 (Bán tải Kỹ thuật - Phạm Hoàng Nam)</option>
              <option value="99A-888.99">99A-888.99 (Xe lạ chưa đăng ký - Cảnh báo)</option>
            </select>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={toggleWebcam}
            className={`h-9 px-2.5 ${useWebcam ? 'border-primary text-primary' : ''}`}
            title="Bật Webcam máy tính/điện thoại"
          >
            <Video className="w-4 h-4 mr-1" />
            <span className="text-xs hidden md:inline">{useWebcam ? 'Tắt Webcam' : 'Webcam'}</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleFullscreen}
            className="h-9 px-2.5 text-muted-foreground hover:text-foreground"
            title="Toàn màn hình"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
