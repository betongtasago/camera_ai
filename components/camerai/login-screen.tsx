'use client'

import { useState } from 'react'
import {
  Camera,
  Shield,
  ShieldCheck,
  Lock,
  Mail,
  UserCheck,
  Eye,
  EyeOff,
  KeyRound,
  Sun,
  Moon,
  Truck,
  Sparkles,
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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
              CamerAI
            </span>
            <Badge
              variant="outline"
              className="ml-2 text-[10px] font-mono px-1.5 py-0.5 border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
            >
              ANPR PRO
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

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
          {/* Card Title */}
          <div className="text-center space-y-2 mb-6">
            <div className="inline-flex w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center text-primary mb-1">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Đăng Nhập Hệ Thống
            </h1>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Vui lòng đăng nhập tài khoản để truy cập hệ thống giám sát camera AI và quản lý danh mục xe
            </p>
          </div>

          {/* Quick 1-Click Login for Demo & Testing */}
          <div className="bg-muted/40 p-3.5 rounded-xl border border-border space-y-2.5 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Chọn tài khoản đăng nhập nhanh:
              </span>
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-auto py-2.5 px-3 flex flex-col items-start justify-center text-left bg-background hover:border-primary border-border"
                onClick={() => handleLogin(undefined, 'admin@camerai.vn', 'Admin@123456')}
                disabled={isLoading}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Admin</span>
                  <Badge className="ml-auto text-[9px] px-1 py-0 bg-primary/15 text-primary border-primary/30">
                    TOÀN QUYỀN
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  admin@camerai.vn
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-auto py-2.5 px-3 flex flex-col items-start justify-center text-left bg-background hover:border-primary border-border"
                onClick={() => handleLogin(undefined, 'operator@camerai.vn', 'Operator@123456')}
                disabled={isLoading}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Giám sát viên</span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  operator@camerai.vn
                </span>
              </Button>
            </div>
          </div>

          {/* Custom Credentials Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Email tài khoản</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@camerai.vn"
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
                Thông tin tài khoản mặc định:
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>
                  • <strong>Admin:</strong> admin@camerai.vn
                </span>
                <code className="bg-background px-1.5 py-0.5 rounded border border-border font-mono text-primary font-bold">
                  Admin@123456
                </code>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>
                  • <strong>Operator:</strong> operator@camerai.vn
                </span>
                <code className="bg-background px-1.5 py-0.5 rounded border border-border font-mono text-foreground font-semibold">
                  Operator@123456
                </code>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-5xl mx-auto text-center py-3 text-xs text-muted-foreground">
        Hệ Thống CamerAI © 2026 • Giám Sát Camera IP & Nhận Diện Biển Số Xe Trạm Cân Bê Tông
      </div>
    </div>
  )
}
