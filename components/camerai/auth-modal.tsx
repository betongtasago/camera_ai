'use client'

import { useState } from 'react'
import {
  Shield,
  ShieldCheck,
  Lock,
  Mail,
  User,
  LogOut,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  ShieldAlert,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { User as UserType } from '@/lib/types'
import { toast } from 'sonner'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: UserType | null
  onUserChanged: (user: UserType | null) => void
}

export function AuthModal({ isOpen, onClose, currentUser, onUserChanged }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Login handler
  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault()
    const targetEmail = customEmail || email
    const targetPass = customPass || password

    if (!targetEmail || !targetPass) {
      toast.error('Vui lòng nhập đầy đủ Email và Mật khẩu')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPass }),
      })

      const data = await res.json()
      if (res.ok && data.user) {
        onUserChanged(data.user)
        toast.success(`Đăng nhập thành công: ${data.user.name} (${data.user.role.toUpperCase()})`)
        onClose()
      } else {
        toast.error(data.error || 'Email hoặc mật khẩu không chính xác')
      }
    } catch {
      toast.error('Lỗi khi kết nối với máy chủ xác thực')
    } finally {
      setIsLoading(false)
    }
  }

  // Logout handler
  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      onUserChanged(null)
      toast.success('Đã đăng xuất tài khoản an toàn')
      onClose()
    } catch {
      toast.error('Lỗi khi đăng xuất')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-primary" />
            {currentUser ? 'Tài Khoản Hệ Thống' : 'Đăng Nhập Giám Sát Camera AI'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Hệ thống phân quyền bảo mật: Admin (Quản trị toàn quyền) và Operator (Giám sát trạm cân).
          </DialogDescription>
        </DialogHeader>

        {currentUser ? (
          /* User Profile & Logout View */
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/40 border border-border">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                {currentUser.name.charAt(0)}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="font-semibold text-sm text-foreground truncate">{currentUser.name}</div>
                <div className="text-xs text-muted-foreground truncate">{currentUser.email}</div>
                <div className="mt-1">
                  <Badge
                    className={
                      currentUser.role === 'admin'
                        ? 'bg-primary/20 text-primary border-primary/30 text-[10px]'
                        : 'bg-muted text-muted-foreground border-border text-[10px]'
                    }
                  >
                    {currentUser.role === 'admin' ? 'QUẢN TRỊ VIÊN (ADMIN)' : 'GIÁM SÁT VIÊN (OPERATOR)'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground p-3 bg-muted/20 rounded-lg border border-border/60">
              {currentUser.role === 'admin' ? (
                <span>
                  ✓ Bạn có quyền thêm, sửa, xóa danh mục xe đăng ký và cấu hình thông số kỹ thuật camera IP & Supabase.
                </span>
              ) : (
                <span>
                  ✓ Bạn đang ở chế độ Giám sát: Có thể xem trực tiếp camera AI, đối soát xe vào cổng và phát lệnh mở Barie.
                </span>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                Đóng
              </Button>
              <Button
                variant="destructive"
                onClick={handleLogout}
                disabled={isLoading}
                className="gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                Đăng Xuất
              </Button>
            </div>
          </div>
        ) : (
          /* Login View */
          <div className="space-y-4 py-2">
            {/* Quick 1-Click Login for Demo */}
            <div className="bg-muted/40 p-3 rounded-xl border border-border space-y-2">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Đăng nhập nhanh để trải nghiệm:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-14 flex flex-col items-start justify-center p-2 text-left bg-background hover:border-primary"
                  onClick={() => handleLogin(undefined, 'admin@camerai.vn', 'Admin@123456')}
                  disabled={isLoading}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    Tài khoản Admin
                  </div>
                  <span className="text-[10px] text-muted-foreground">Toàn quyền thêm xe & cài đặt</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-14 flex flex-col items-start justify-center p-2 text-left bg-background hover:border-primary"
                  onClick={() => handleLogin(undefined, 'operator@camerai.vn', 'Operator@123456')}
                  disabled={isLoading}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Giám sát viên
                  </div>
                  <span className="text-[10px] text-muted-foreground">Xem camera & mở Barie</span>
                </Button>
              </div>
            </div>

            {/* Custom Credentials Form */}
            <form onSubmit={handleLogin} className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email tài khoản</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@camerai.vn"
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mật khẩu</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mật khẩu bảo mật"
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-10 mt-2 font-medium" disabled={isLoading}>
                {isLoading ? 'Đang xác thực...' : 'Đăng Nhập Hệ Thống'}
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
