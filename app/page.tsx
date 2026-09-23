'use client'

import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CameraLiveFeed } from '@/components/camerai/camera-live-feed'
import { VehicleManagement } from '@/components/camerai/vehicle-management'
import { CameraSettingsModal } from '@/components/camerai/camera-settings-modal'
import { DetectionLogs } from '@/components/camerai/detection-logs'
import { AuthModal } from '@/components/camerai/auth-modal'
import { MobileNav } from '@/components/camerai/mobile-nav'
import { INITIAL_CAMERAS, INITIAL_EVENTS, INITIAL_VEHICLES } from '@/lib/storage'
import { CameraConfig, DetectionResult, User, Vehicle } from '@/lib/types'
import { toast } from 'sonner'

export default function HomePage() {
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'monitor' | 'vehicles' | 'logs' | 'settings'>('monitor')

  // Auth & User state
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  // Cameras state
  const [cameras, setCameras] = useState<CameraConfig[]>(INITIAL_CAMERAS)
  const [selectedCameraId, setSelectedCameraId] = useState<string>('cam_01')

  // Live detection & logs state
  const [latestDetection, setLatestDetection] = useState<DetectionResult>(INITIAL_EVENTS[0])
  const [detectionLogs, setDetectionLogs] = useState<DetectionResult[]>(INITIAL_EVENTS)
  const [todayStats, setTodayStats] = useState({ total: 48, passed: 45, warnings: 3 })
  const [isMounted, setIsMounted] = useState(false)

  // Mount check to prevent SSR hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Check auth on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user)
        } else {
          // Default demo user for seamless access: Admin
          setCurrentUser({
            id: 'usr_admin_01',
            email: 'admin@camerai.vn',
            name: 'Quản trị viên Hệ thống',
            role: 'admin',
          })
        }
      })
      .catch(() => {
        // Local fallback
        setCurrentUser({
          id: 'usr_admin_01',
          email: 'admin@camerai.vn',
          name: 'Quản trị viên Hệ thống',
          role: 'admin',
        })
      })
  }, [])

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
                  CamerAI
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
                  ? 'bg-background shadow-xs text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              Camera AI
            </button>

            <button
              onClick={() => setActiveTab('vehicles')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'vehicles'
                  ? 'bg-background shadow-xs text-primary'
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
                  ? 'bg-background shadow-xs text-primary'
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
                  ? 'bg-background shadow-xs text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Cấu Hình IP
            </button>
          </nav>

          {/* User & Theme Actions */}
          <div className="flex items-center gap-2">
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

            {/* Account Button */}
            {currentUser ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAuthModalOpen(true)}
                className="h-9 text-xs px-2.5 sm:px-3 border-border bg-card"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                <span className="font-semibold truncate max-w-[90px] sm:max-w-[120px]">{currentUser.name}</span>
                <Badge
                  className={
                    currentUser.role === 'admin'
                      ? 'ml-1.5 bg-primary/15 text-primary border-primary/20 text-[9px] px-1 py-0'
                      : 'ml-1.5 bg-muted text-muted-foreground text-[9px] px-1 py-0'
                  }
                >
                  {currentUser.role === 'admin' ? 'ADMIN' : 'OPERATOR'}
                </Badge>
              </Button>
            ) : (
              <Button size="sm" onClick={() => setIsAuthModalOpen(true)} className="h-9 text-xs font-semibold">
                <LogIn className="w-3.5 h-3.5 mr-1.5" />
                Đăng nhập
              </Button>
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
                <CameraLiveFeed
                  currentCamera={currentCamera}
                  onDetectionTriggered={handleDetectionTriggered}
                  userRole={currentUser?.role}
                />
              </div>

              {/* Right Column: Live Detection & Fleet Verification Inspector */}
              <div className="lg:col-span-4 flex flex-col gap-4">
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
                        {isMounted ? new Date(latestDetection.timestamp).toLocaleTimeString('vi-VN') : '16:36:08'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-border flex flex-col gap-2">
                    <Button
                      onClick={handleSendTelegram}
                      className="w-full h-10 font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/20"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      GỬI BÁO CÁO QUA TELEGRAM
                    </Button>

                    {!latestDetection.isMatch && (
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab('vehicles')}
                        className="w-full h-9 text-xs text-primary border-primary/30 hover:bg-primary/10"
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

        {/* TAB 2: REGISTERED FLEET (BIỂN SỐ, TÀI XẾ, LOẠI XE) */}
        {activeTab === 'vehicles' && (
          <VehicleManagement
            userRole={currentUser?.role}
            onFleetUpdated={() => toast.success('Danh mục xe đã được đồng bộ')}
          />
        )}

        {/* TAB 3: DETECTION LOGS */}
        {activeTab === 'logs' && (
          <DetectionLogs
            logs={detectionLogs}
            onRefresh={() => toast.info('Đã cập nhật nhật ký mới nhất')}
            onAddVehiclePrompt={(plate, type) => {
              setActiveTab('vehicles')
              toast.info(`Chuyển sang trang Thêm xe cho biển số: ${plate}`)
            }}
          />
        )}

        {/* TAB 4: CAMERA IP & SUPABASE SETTINGS */}
        {activeTab === 'settings' && (
          <CameraSettingsModal
            currentCamera={currentCamera}
            onCameraUpdated={(cam) => {
              setCameras((prev) => prev.map((c) => (c.id === cam.id ? cam : c)))
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
