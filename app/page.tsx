'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Camera,
  Video,
  Truck,
  ClipboardList,
  Settings,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  LogIn,
  LogOut,
  Sparkles,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Car,
  ChevronRight,
  Sun,
  Moon,
  Plus,
  Radio,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CameraLiveFeed } from '@/components/camerai/camera-live-feed'
import { VehicleManagement } from '@/components/camerai/vehicle-management'
import { CameraSettingsModal } from '@/components/camerai/camera-settings-modal'
import { DetectionLogs } from '@/components/camerai/detection-logs'
import { AuthModal } from '@/components/camerai/auth-modal'
import { LoginScreen } from '@/components/camerai/login-screen'
import { MobileNav } from '@/components/camerai/mobile-nav'
import { INITIAL_CAMERAS, INITIAL_EVENTS, INITIAL_VEHICLES } from '@/lib/storage'
import { CameraConfig, DetectionResult, User, Vehicle } from '@/lib/types'
import { useRealtimeSync } from '@/lib/hooks/use-realtime-sync'
import { toast } from 'sonner'

export default function HomePage() {
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'monitor' | 'vehicles' | 'logs' | 'settings'>('monitor')

  // Auth & User state
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  // Cameras state
  const [cameras, setCameras] = useState<CameraConfig[]>(INITIAL_CAMERAS)
  const [selectedCameraId, setSelectedCameraId] = useState<string>('cam_01')

  // Live detection & logs state
  const [latestDetection, setLatestDetection] = useState<DetectionResult>(INITIAL_EVENTS[0])
  const [detectionLogs, setDetectionLogs] = useState<DetectionResult[]>(INITIAL_EVENTS)
  const [todayStats, setTodayStats] = useState({ total: 48, passed: 45, warnings: 3 })
  const [isMounted, setIsMounted] = useState(false)

  // Telegram auto notification setting: default is OFF per user requirement
  const [telegramAutoNotify, setTelegramAutoNotify] = useState<boolean>(false)

  // Fleet pre-fill navigation state
  const [prefillPlate, setPrefillPlate] = useState<string>('')
  const [autoOpenVehicleModal, setAutoOpenVehicleModal] = useState<boolean>(false)

  // Fetch cameras from server/Supabase
  const fetchCameras = useCallback(async () => {
    try {
      const res = await fetch('/api/cameras')
      if (res.ok) {
        const data = await res.json()
        if (data.cameras && data.cameras.length > 0) {
          setCameras(data.cameras)
        }
      }
    } catch {
      // Fallback to existing
    }
  }, [])

  // Fetch detection logs from server/Supabase
  const fetchDetectionLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/events')
      if (res.ok) {
        const data = await res.json()
        if (data.events && data.events.length > 0) {
          setDetectionLogs(data.events)
          setLatestDetection(data.events[0])
          const passedCount = data.events.filter((e: DetectionResult) => e.isMatch).length
          setTodayStats({
            total: data.events.length,
            passed: passedCount,
            warnings: data.events.length - passedCount,
          })
        }
      }
    } catch {
      // Fallback to existing
    }
  }, [])

  const fetchTelegramSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/telegram')
      if (res.ok) {
        const data = await res.json()
        setTelegramAutoNotify(Boolean(data.config?.enabled))
      }
    } catch {
      // Keep the current value when the settings endpoint is temporarily unavailable.
    }
  }, [])

  const handleToggleTelegramAutoNotify = useCallback(async (enabled: boolean) => {
    setTelegramAutoNotify(enabled)
    try {
      await fetch('/api/telegram', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
    } catch {
      toast.error('Không thể đồng bộ trạng thái Telegram')
    }
  }, [])

  // Real-time synchronization across all browser tabs, devices, and sessions
  const { status: realtimeStatus } = useRealtimeSync({
    onCamerasUpdated: (msg) => {
      fetchCameras()
      toast.info('Cấu hình Camera vừa được cập nhật bởi quản trị viên (đồng bộ tức thời)')
    },
    onVehiclesUpdated: (msg) => {
      if (msg.type === 'vehicles_updated') {
        if (msg.action === 'create') {
          toast.info('Quản trị viên vừa thêm xe mới vào danh mục (đã đồng bộ tức thời)')
        } else if (msg.action === 'update') {
          toast.info('Thông tin xe vừa được quản trị viên chỉnh sửa (đã đồng bộ tức thời)')
        } else if (msg.action === 'delete') {
          toast.info('Một xe vừa được gỡ khỏi danh mục (đã đồng bộ tức thời)')
        }
      }
    },
    onLogAdded: (log) => {
      setLatestDetection(log)
      setDetectionLogs((prev) => {
        if (prev.some((p) => p.id === log.id)) return prev
        return [log, ...prev.slice(0, 49)]
      })
      setTodayStats((prev) => ({
        total: prev.total + 1,
        passed: log.isMatch ? prev.passed + 1 : prev.passed,
        warnings: !log.isMatch ? prev.warnings + 1 : prev.warnings,
      }))
    },
    onSettingsUpdated: (event) => {
      if (event.section === 'telegram') fetchTelegramSettings()
      if (event.section === 'supabase') fetchCameras()
    },
    onFullSyncRequired: () => {
      fetchCameras()
      fetchDetectionLogs()
    },
  })

  // Mount check and initial data hydration
  useEffect(() => {
    setIsMounted(true)
    fetchCameras()
    fetchDetectionLogs()
    fetchTelegramSettings()
  }, [fetchCameras, fetchDetectionLogs, fetchTelegramSettings])

  // Check auth on mount: requires login to view page content
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user)
        } else {
          setCurrentUser(null)
        }
      })
      .catch(() => {
        setCurrentUser(null)
      })
      .finally(() => {
        setIsAuthChecking(false)
      })
  }, [])

  // Member role restriction: Members only have access to view Camera AI
  const isMember = currentUser?.role === 'member'
  const isAdmin = currentUser?.role === 'admin'

  useEffect(() => {
    if (isMember && activeTab !== 'monitor') {
      setActiveTab('monitor')
    }
  }, [isMember, activeTab])

  // Explicit logout handler
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Ignore
    } finally {
      setCurrentUser(null)
      toast.success('Đã đăng xuất tài khoản an toàn')
    }
  }

  // Currently active camera
  const currentCamera = cameras.find((c) => c.id === selectedCameraId) || cameras[0]

  // Handle incoming AI detection event
  const handleDetectionTriggered = (result: DetectionResult) => {
    setLatestDetection(result)
    setDetectionLogs((prev) => [result, ...prev.slice(0, 49)])
    setTodayStats((prev) => ({
      total: prev.total + 1,
      passed: result.isMatch ? prev.passed + 1 : prev.passed,
      warnings: !result.isMatch ? prev.warnings + 1 : prev.warnings,
    }))
  }

  // Send manual Telegram alert for latest detected vehicle
  const handleSendTelegram = async () => {
    try {
      const res = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detection: latestDetection }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Đã gửi thông báo xe ${latestDetection.plateNumber} qua Telegram!`)
      } else {
        toast.error(data.error || 'Lỗi gửi tin Telegram')
      }
    } catch {
      toast.error('Không thể kết nối đến dịch vụ Telegram')
    }
  }

  // Loading session state
  if (isAuthChecking) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background gap-3">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground font-mono">Đang kiểm tra phiên đăng nhập TSG-TNT AI...</p>
      </div>
    )
  }

  // Enforce Login: Only display page content after logging in
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground pb-16 md:pb-6">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Logo & Status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
                  TSG-TNT AI
                </span>
                <Badge
                  variant="outline"
                  className="hidden sm:inline-flex text-[10px] font-mono px-1.5 py-0.5 border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                  ANPR PRO
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Giám sát Camera IP & Nhận diện Biển số Xe
              </p>
            </div>
          </div>

          {/* Camera Selector (Quick Switch) */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Kênh Camera:</span>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="bg-muted/60 border border-border rounded-lg px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.location})
                </option>
              ))}
            </select>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveTab('monitor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'monitor'
                  ? 'bg-background shadow-xs text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              Camera AI
            </button>

            {!isMember && (
              <>
                <button
                  onClick={() => setActiveTab('vehicles')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'vehicles'
                      ? 'bg-background shadow-xs text-primary font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  Danh Mục Xe
                </button>

                <button
                  onClick={() => setActiveTab('logs')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'logs'
                      ? 'bg-background shadow-xs text-primary font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  Nhật Ký ({detectionLogs.length})
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'settings'
                      ? 'bg-background shadow-xs text-primary font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  Cấu Hình IP
                </button>
              </>
            )}
          </nav>

          {/* User & Theme Actions */}
          <div className="flex items-center gap-2">
            {/* Realtime Sync Status Indicator */}
            <Badge
              variant="outline"
              className={`hidden md:inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-lg border ${
                realtimeStatus === 'connected'
                  ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10'
                  : 'border-amber-500/30 text-amber-500 bg-amber-500/10'
              }`}
              title="Đồng bộ tức thời đa phiên đăng nhập và đa trình duyệt qua Supabase & Server-Sent Events"
            >
              <Radio
                className={`w-3 h-3 ${
                  realtimeStatus === 'connected' ? 'text-emerald-500 animate-pulse' : 'text-amber-500'
                }`}
              />
              <span className="font-semibold">
                {realtimeStatus === 'connected' ? 'ĐỒNG BỘ TỨC THỜI' : 'ĐANG KẾT NỐI...'}
              </span>
            </Badge>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9 text-muted-foreground"
              title="Đổi giao diện Sáng / Tối"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            {/* Account Button & Logout Button */}
            {currentUser && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="h-9 text-xs px-2.5 sm:px-3 border-border bg-card"
                  title="Thông tin tài khoản"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                  <span className="font-semibold truncate max-w-[90px] sm:max-w-[120px]">{currentUser.name}</span>
                  <Badge
                    className={
                      currentUser.role === 'admin'
                        ? 'ml-1.5 bg-primary/15 text-primary border-primary/20 text-[9px] px-1 py-0'
                        : currentUser.role === 'operator'
                          ? 'ml-1.5 bg-emerald-500/15 text-emerald-500 border-emerald-500/20 text-[9px] px-1 py-0'
                          : 'ml-1.5 bg-sky-500/15 text-sky-500 border-sky-500/20 text-[9px] px-1 py-0'
                    }
                  >
                    {currentUser.role === 'admin' ? 'ADMIN' : currentUser.role === 'operator' ? 'OPERATOR' : 'MEMBER'}
                  </Badge>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="h-9 text-xs text-muted-foreground hover:text-destructive px-2 sm:px-2.5"
                  title="Đăng xuất khỏi hệ thống"
                >
                  <LogOut className="w-4 h-4 sm:mr-1.5 text-muted-foreground hover:text-destructive" />
                  <span className="hidden sm:inline">Đăng xuất</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 flex flex-col gap-6">
        {/* TAB 1: LIVE MONITOR (CAMERA & REAL-TIME FLEET MATCHING) */}
        {activeTab === 'monitor' && (
          <div className="flex flex-col gap-6">
            {/* Quick Camera Channel Bar on Mobile / Tablet */}
            <div className="flex lg:hidden items-center justify-between gap-2 bg-card p-2.5 rounded-xl border border-border">
              <span className="text-xs font-semibold text-muted-foreground">Kênh Camera:</span>
              <select
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className="bg-muted text-foreground border border-border rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none flex-1 max-w-[260px]"
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Layout: Video Viewport + Live Vehicle Inspection Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Live Camera Video / Simulation with AI Overlay */}
              <div className="lg:col-span-8 flex flex-col gap-3">
                {isAdmin && (
                  <CameraLiveFeed
                    currentCamera={currentCamera}
                    onDetectionTriggered={handleDetectionTriggered}
                    userRole={currentUser?.role}
                    telegramAutoNotify={telegramAutoNotify}
                    onToggleTelegramAutoNotify={handleToggleTelegramAutoNotify}
                  />
                )}
              </div>

              {/* Right Column: Live Detection & Fleet Verification Inspector */}
              <div className={`lg:col-span-4 flex flex-col gap-4 ${!isAdmin ? 'hidden' : ''}`}>
                {/* Active Match Card */}
                <div
                  className={`bg-card border rounded-xl p-4 sm:p-5 shadow-sm transition-all ${
                    latestDetection.isMatch ? 'border-emerald-500/40' : 'border-amber-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Xe Vừa Đi Qua Camera
                      </span>
                    </div>
                    {latestDetection.isMatch ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        ĐÃ ĐĂNG KÝ
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        NGOÀI DANH MỤC
                      </Badge>
                    )}
                  </div>

                  {/* License Plate Display (Big & Bold with Red Frame like CCTV zoom) */}
                  <div className="my-4 bg-zinc-950 p-3 rounded-lg border-2 border-red-500 flex flex-col items-center justify-center text-center shadow-inner">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-red-400 font-bold mb-0.5">
                      BIỂN SỐ NHẬN DẠNG (OCR)
                    </span>
                    <span className="font-mono text-2xl sm:text-3xl font-black text-white tracking-widest">
                      {latestDetection.plateNumber}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 mt-1">
                      Độ chính xác AI: {latestDetection.confidence}%
                    </span>
                  </div>

                  {/* Vehicle Details */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Tên tài xế:</span>
                      <span className="font-semibold text-foreground">
                        {latestDetection.matchedVehicle?.driverName || '— Chưa đăng ký trong hệ thống —'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Loại phương tiện:</span>
                      <span className="font-medium text-foreground">
                        {latestDetection.matchedVehicle?.vehicleType || latestDetection.vehicleType}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Đơn vị / Đội xe:</span>
                      <span className="font-medium text-foreground">
                        {latestDetection.matchedVehicle?.company || latestDetection.details?.brand || 'Khách vãng lai'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Camera ghi nhận:</span>
                      <span className="font-mono text-foreground font-semibold">{latestDetection.locationTag}</span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Thời gian:</span>
                      <span className="font-mono text-muted-foreground" suppressHydrationWarning>
                        {isMounted
                          ? new Intl.DateTimeFormat('vi-VN', {
                              timeZone: 'Etc/GMT-8',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false,
                            }).format(new Date(latestDetection.timestamp))
                          : '--:--:--'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons & Telegram Mode */}
                  <div className="mt-4 pt-3 border-t border-border flex flex-col gap-2.5">
                    {/* Telegram Auto Notification Toggle Control */}
                    <div className="bg-muted/40 p-2.5 rounded-xl border border-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                            telegramAutoNotify ? 'bg-sky-500/20 text-sky-500' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Send className={`w-3.5 h-3.5 ${telegramAutoNotify ? 'animate-pulse' : ''}`} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground">Tự động báo Telegram</span>
                          <span className="text-[10px] text-muted-foreground">
                            {telegramAutoNotify ? 'Đang BẬT: Báo bot khi có xe' : 'Đang TẮT: Bấm nút để gửi thủ công'}
                          </span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant={telegramAutoNotify ? 'default' : 'outline'}
                        onClick={() => {
                          const next = !telegramAutoNotify
                          setTelegramAutoNotify(next)
                          if (next) {
                            toast.success('Đã BẬT tự động gửi tin nhắn Telegram khi có xe!')
                          } else {
                            toast.info('Đã TẮT tự động gửi Telegram (Bạn có thể bấm gửi thủ công)')
                          }
                        }}
                        className={`h-7 px-3 text-xs font-extrabold transition-all ${
                          telegramAutoNotify
                            ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                        title="Bật/Tắt chế độ tự động thông báo Telegram"
                      >
                        {telegramAutoNotify ? 'BẬT' : 'TẮT'}
                      </Button>
                    </div>

                    {isAdmin && (
                      <Button
                        onClick={handleSendTelegram}
                        className="w-full h-10 font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/20"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        GỬI BÁO CÁO QUA TELEGRAM
                      </Button>
                    )}

                    {!latestDetection.isMatch && !isMember && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setPrefillPlate(latestDetection.plateNumber)
                          setAutoOpenVehicleModal(true)
                          setActiveTab('vehicles')
                          toast.info(`Chuyển sang trang Thêm xe cho biển số: ${latestDetection.plateNumber}`)
                        }}
                        className="w-full h-9 text-xs text-primary border-primary/30 hover:bg-primary/10 font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Đăng Ký Biển Số Này Vào Danh Mục
                      </Button>
                    )}
                  </div>
                </div>

                {/* Daily Fleet Traffic Stats */}
                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    Lưu Lượng Xe Hôm Nay (Ca Trực)
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                      <div className="text-lg font-black text-foreground">{todayStats.total}</div>
                      <div className="text-[10px] text-muted-foreground">Tổng lượt</div>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <div className="text-lg font-black text-emerald-500">{todayStats.passed}</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Đã đăng ký</div>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="text-lg font-black text-amber-500">{todayStats.warnings}</div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400">Ngoài danh mục</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTERED FLEET (BIỂN SỐ, TÀI XẾ, LOẠI XE) - Hidden for Member */}
        {activeTab === 'vehicles' && !isMember && (
          <VehicleManagement
            userRole={currentUser?.role}
            initialPlate={prefillPlate}
            autoOpenCreate={autoOpenVehicleModal}
            onFleetUpdated={() => {
              // reset prefill after consumed
              setPrefillPlate('')
              setAutoOpenVehicleModal(false)
            }}
          />
        )}

        {/* TAB 3: DETECTION LOGS - Hidden for Member */}
        {activeTab === 'logs' && !isMember && (
          <DetectionLogs
            logs={detectionLogs}
            userRole={currentUser?.role}
            onRefresh={async () => {
              await fetchDetectionLogs()
              toast.info('Đã tải lại nhật ký mới nhất')
            }}
            onLogsChanged={fetchDetectionLogs}
            onAddVehiclePrompt={(plate) => {
              setPrefillPlate(plate)
              setAutoOpenVehicleModal(true)
              setActiveTab('vehicles')
              toast.info(`Chuyển sang trang Thêm xe cho biển số: ${plate}`)
            }}
          />
        )}

        {/* TAB 4: CAMERA IP & SUPABASE SETTINGS - Hidden for Member */}
        {activeTab === 'settings' && !isMember && (
          <CameraSettingsModal
            currentCamera={currentCamera}
            cameras={cameras}
            onSelectCamera={(cam) => setSelectedCameraId(cam.id)}
            onCameraUpdated={(cam) => {
              setCameras((prev) => prev.map((c) => (c.id === cam.id ? cam : c)))
            }}
            onCameraAdded={(newCam) => {
              setCameras((prev) => [...prev, newCam])
              setSelectedCameraId(newCam.id)
            }}
            onCameraDeleted={(id) => {
              setCameras((prev) => {
                const updated = prev.filter((c) => c.id !== id)
                if (selectedCameraId === id && updated.length > 0) {
                  setSelectedCameraId(updated[0].id)
                }
                return updated
              })
            }}
          />
        )}
      </main>

      {/* Auth & Profile Dialog */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChanged={setCurrentUser}
      />

      {/* Mobile Bottom Navigation (Visible ONLY on phones/tablets) */}
      <MobileNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as any)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        userRole={currentUser?.role}
        isLoggedIn={Boolean(currentUser)}
      />
    </div>
  )
}
