'use client'

import { useState } from 'react'
import {
  Camera,
  Shield,
  ShieldCheck,
  Lock,
  Mail,
  UserCheck,
  User,
  UserPlus,
  Eye,
  EyeOff,
  KeyRound,
  Sun,
  Moon,
  Truck,
  Sparkles,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { User as UserType } from '@/lib/types'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'

interface LoginScreenProps {
  onLoginSuccess: (user: UserType) => void
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')

  // Login form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Registration form state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault()
    const targetEmail = customEmail || email
    const targetPass = customPass || password

    if (!targetEmail.trim() || !targetPass) {
      toast.error('Vui lòng nhập đầy đủ Email và Mật khẩu')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail.trim(), password: targetPass }),
      })

      const data = await res.json()
      if (res.ok && data.user) {
        toast.success(`Đăng nhập thành công: ${data.user.name}`)
        onLoginSuccess(data.user)
      } else {
        toast.error(data.error || 'Email hoặc mật khẩu không chính xác')
      }
    } catch {
      toast.error('Không thể kết nối đến máy chủ xác thực')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!regName.trim()) {
      toast.error('Vui lòng nhập Họ và tên')
      return
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      toast.error('Vui lòng nhập Email hợp lệ')
      return
    }
    if (regPassword.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }
    if (regPassword !== regConfirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp')
      return
    }

    setIsRegistering(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          password: regPassword,
        }),
      })

      const data = await res.json()
      if (res.ok && data.user) {
        toast.success(`Đăng ký thành công! Chào mừng thành viên: ${data.user.name}`)
        onLoginSuccess(data.user)
      } else {
        toast.error(data.error || 'Đăng ký không thành công')
      }
    } catch {
      toast.error('Không thể kết nối đến máy chủ')
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-br from-background via-muted/30 to-background p-4 sm:p-6">
      {/* Top Header */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <span className="font-black text-lg tracking-tight bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
              TSG-TNT AI
            </span>
            <Badge
              variant="outline"
              className="ml-2 text-[10px] font-mono px-1.5 py-0.5 border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
            >
              ANPR PRO • TSG-TNT AI
            </Badge>
          </div>
        </div>

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
      </div>

      {/* Main Card Container */}
      <div className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
          {/* Header Switcher: Login vs Register */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/60 rounded-xl mb-6 border border-border">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'login'
                  ? 'bg-card text-primary shadow-xs font-extrabold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Đăng Nhập
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'register'
                  ? 'bg-card text-primary shadow-xs font-extrabold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Đăng Ký Thành Viên
            </button>
          </div>

          {activeTab === 'login' ? (
            <div>
              {/* Card Title */}
              <div className="text-center space-y-1.5 mb-5">
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  Đăng Nhập Hệ Thống
                </h1>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Đăng nhập tài khoản để giám sát camera AI hoặc xem luồng trực tiếp
                </p>
              </div>

              {/* Quick 1-Click Login for Demo & Testing */}
              <div className="bg-muted/40 p-3 rounded-xl border border-border space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Tài khoản mẫu đăng nhập nhanh:
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 px-2 flex flex-col items-start justify-center text-left bg-background hover:border-primary border-border"
                    onClick={() => handleLogin(undefined, 'admin@camerai.vn', 'Admin@123456')}
                    disabled={isLoading}
                  >
                    <div className="flex items-center gap-1 font-bold text-xs text-foreground w-full">
                      <ShieldCheck className="w-3 h-3 text-primary shrink-0" />
                      <span>Admin</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1">Toàn quyền</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 px-2 flex flex-col items-start justify-center text-left bg-background hover:border-primary border-border"
                    onClick={() => handleLogin(undefined, 'operator@camerai.vn', 'Operator@123456')}
                    disabled={isLoading}
                  >
                    <div className="flex items-center gap-1 font-bold text-xs text-foreground w-full">
                      <UserCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>Giám sát</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1">Vận hành ca</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 px-2 flex flex-col items-start justify-center text-left bg-background hover:border-sky-500 border-border"
                    onClick={() => handleLogin(undefined, 'member@camerai.vn', 'Member@123456')}
                    disabled={isLoading}
                  >
                    <div className="flex items-center gap-1 font-bold text-xs text-foreground w-full">
                      <User className="w-3 h-3 text-sky-500 shrink-0" />
                      <span>Member</span>
                    </div>
                    <span className="text-[9px] text-sky-600 dark:text-sky-400 mt-0.5 line-clamp-1">Chỉ xem Cam</span>
                  </Button>
                </div>
              </div>

              {/* Custom Credentials Form */}
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Email tài khoản</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@camerai.vn hoặc member@camerai.vn"
                      className="pl-9 text-sm h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Mật khẩu</Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 pr-10 text-sm h-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20"
                  disabled={isLoading}
                >
                  {isLoading ? 'Đang xác thực tài khoản...' : 'ĐĂNG NHẬP VÀO HỆ THỐNG'}
                </Button>

                {/* Default Accounts Note */}
                <div className="p-3 rounded-xl bg-muted/50 border border-border text-[11px] text-muted-foreground space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5 mb-1">
                    <KeyRound className="w-3.5 h-3.5 text-primary" />
                    Tài khoản mặc định:
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>• <strong>Admin:</strong> admin@camerai.vn</span>
                    <code className="bg-background px-1.5 py-0.5 rounded border border-border font-mono text-primary font-bold">
                      Admin@123456
                    </code>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>• <strong>Member:</strong> member@camerai.vn</span>
                    <code className="bg-background px-1.5 py-0.5 rounded border border-border font-mono text-sky-500 font-bold">
                      Member@123456
                    </code>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div>
              {/* Register Form Header */}
              <div className="text-center space-y-1.5 mb-5">
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  Đăng Ký Thành Viên (Member)
                </h1>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Tạo tài khoản để truy cập và xem luồng trực tiếp camera AI
                </p>
              </div>

              {/* Role Info Box */}
              <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-xs text-foreground flex items-start gap-2.5 mb-4">
                <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="text-sky-500">Quyền hạn Thành viên:</strong> Được cấp quyền theo dõi luồng
                  video camera trực tiếp và thông tin nhận diện xe. Các khu vực quản trị danh mục xe, lịch sử và cài
                  đặt hệ thống sẽ được ẩn an toàn.
                </div>
              </div>

              {/* Member Registration Form */}
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Họ và tên *</Label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="pl-9 text-sm h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Email đăng ký *</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="thanhvien@gmail.com"
                      className="pl-9 text-sm h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Mật khẩu (tối thiểu 6 ký tự) *</Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 pr-10 text-sm h-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Xác nhận mật khẩu *</Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 pr-10 text-sm h-10 font-mono"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20"
                  disabled={isRegistering}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {isRegistering ? 'Đang tạo tài khoản...' : 'HOÀN TẤT ĐĂNG KÝ THÀNH VIÊN'}
                </Button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors underline"
                  >
                    Đã có tài khoản? Đăng nhập ngay
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-5xl mx-auto text-center py-3 text-xs text-muted-foreground">
        Hệ Thống TSG-TNT AI © 2026 • Giám Sát Camera IP & Nhận Diện Biển Số Xe Trạm Cân Bê Tông
      </div>
    </div>
  )
}
