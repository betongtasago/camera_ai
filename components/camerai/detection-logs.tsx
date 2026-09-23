'use client'

import { useState, useMemo } from 'react'
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  RefreshCw,
  Send,
  Clock,
  Plus,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { DetectionResult, UserRole } from '@/lib/types'
import { toast } from 'sonner'

interface DetectionLogsProps {
  logs: DetectionResult[]
  userRole?: UserRole
  onRefresh?: () => void
  onAddVehiclePrompt?: (plateNumber: string, vehicleType: string) => void
  onLogsChanged?: () => void
}

export function DetectionLogs({
  logs = [],
  userRole = 'admin',
  onRefresh,
  onAddVehiclePrompt,
  onLogsChanged,
}: DetectionLogsProps) {
  const [filter, setFilter] = useState<'all' | 'passed' | 'warning'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [isClearModalOpen, setIsClearModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [logToDelete, setLogToDelete] = useState<DetectionResult | null>(null)

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        if (filter === 'passed' && !log.isMatch) return false
        if (filter === 'warning' && log.isMatch) return false
        if (fromDate && new Date(log.timestamp).getTime() < new Date(`${fromDate}T00:00:00+08:00`).getTime())
          return false
        if (toDate && new Date(log.timestamp).getTime() > new Date(`${toDate}T23:59:59+08:00`).getTime()) return false
        return true
      }),
    [logs, filter, fromDate, toDate],
  )

  const handleSendTelegram = async (log: DetectionResult) => {
    try {
      const res = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detection: log }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Đã gửi thông báo xe ${log.plateNumber} qua Telegram!`)
      } else {
        toast.error(data.error || 'Lỗi gửi tin Telegram')
      }
    } catch {
      toast.error('Không thể kết nối đến dịch vụ Telegram')
    }
  }

  const handleDeleteSingleLog = async (id: string) => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/events?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Đã xóa bản ghi nhật ký')
        setLogToDelete(null)
        onLogsChanged?.()
        onRefresh?.()
      } else {
        toast.error('Không thể xóa bản ghi')
      }
    } catch {
      toast.error('Lỗi khi xóa bản ghi')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClearAllLogs = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch('/api/events', { method: 'DELETE' })
      if (res.ok) {
        toast.success('Đã dọn sạch toàn bộ nhật ký nhận diện xe')
        setIsClearModalOpen(false)
        onLogsChanged?.()
        onRefresh?.()
      } else {
        toast.error('Không thể xóa toàn bộ nhật ký')
      }
    } catch {
      toast.error('Lỗi khi xóa nhật ký')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.info('Chưa có lịch sử nhận diện để xuất')
      return
    }

    const headers = ['STT,Thời Gian,Vị Trí Camera,Biển Số Xe,Tài Xế,Loại Phương Tiện,Trạng Thái,Độ Tin Cậy']
    const rows = logs.map((l, i) =>
      [
        i + 1,
        `"${new Intl.DateTimeFormat('vi-VN', { timeZone: 'Etc/GMT-8', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(l.timestamp))}"`,
        `"${l.locationTag || l.cameraName}"`,
        `"${l.plateNumber}"`,
        `"${l.matchedVehicle?.driverName || 'Chưa đăng ký'}"`,
        `"${l.matchedVehicle?.vehicleType || l.vehicleType}"`,
        `"${l.isMatch ? 'HỢP LỆ' : 'CẢNH BÁO XE LẠ'}"`,
        `"${l.confidence}%"`,
      ].join(','),
    )

    const csvContent = '\uFEFF' + [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Nhat_Ky_Nhan_Dien_CamerAI_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    toast.success('Đã tải xuống file CSV nhật ký')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Nhật Ký Nhận Diện Xe & Lịch Sử Vào Cổng
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Lịch sử tự động lưu lại khi camera phát hiện xe từ xa và zoom chụp biển số
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filter === 'all' ? 'bg-background shadow-xs font-semibold text-foreground' : 'text-muted-foreground'
              }`}
            >
              Tất cả ({logs.length})
            </button>
            <button
              onClick={() => setFilter('passed')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filter === 'passed' ? 'bg-background shadow-xs font-semibold text-emerald-500' : 'text-muted-foreground'
              }`}
            >
              Hợp lệ
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filter === 'warning' ? 'bg-background shadow-xs font-semibold text-amber-500' : 'text-muted-foreground'
              }`}
            >
              Xe lạ
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs h-9">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Xuất file
          </Button>

          {userRole === 'admin' && logs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearModalOpen(true)}
              className="text-xs h-9 text-destructive border-destructive/30 hover:bg-destructive/10"
              title="Xóa toàn bộ nhật ký"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Xóa hết
            </Button>
          )}

          {onRefresh && (
            <Button variant="ghost" size="icon" onClick={onRefresh} className="h-9 w-9" title="Tải lại nhật ký">
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Logs Table (Desktop) / Cards (Mobile) */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border font-mono">
              <tr>
                <th className="px-4 py-3">Thời Gian</th>
                <th className="px-4 py-3">Vị Trí Camera</th>
                <th className="px-4 py-3">Biển Số Nhận Diện</th>
                <th className="px-4 py-3">Tài Xế & Đơn Vị</th>
                <th className="px-4 py-3">Phương Tiện</th>
                <th className="px-4 py-3">Độ Tin Cậy AI</th>
                <th className="px-4 py-3">Đối Soát Danh Mục</th>
                <th className="px-4 py-3 text-right">Xử Lý & Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    Chưa có lượt xe nào được ghi nhận trong danh sách này
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5" suppressHydrationWarning>
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        {new Intl.DateTimeFormat('vi-VN', {
                          timeZone: 'Etc/GMT-8',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false,
                        }).format(new Date(log.timestamp))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-foreground font-semibold">
                      {log.locationTag || 'CAN - KHU SUA CHUA'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="inline-flex items-center gap-2 bg-zinc-950 px-2.5 py-1 rounded border border-red-500/40 text-white font-mono font-bold tracking-wider text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        {log.plateNumber}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-foreground">
                        {log.matchedVehicle?.driverName || '— Chưa rõ —'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.matchedVehicle?.company || log.details?.brand || 'Khách vãng lai'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {log.matchedVehicle?.vehicleType || log.vehicleType}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-emerald-500 font-semibold">{log.confidence}%</td>
                    <td className="px-4 py-3.5">
                      {log.isMatch ? (
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
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendTelegram(log)}
                          className={`text-xs h-8 px-2.5 font-medium border-sky-500/40 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 ${userRole !== 'admin' ? 'hidden' : ''}`}
                        >
                          <Send className="w-3.5 h-3.5 mr-1" />
                          Báo Telegram
                        </Button>
                        {!log.isMatch && onAddVehiclePrompt && userRole === 'admin' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onAddVehiclePrompt(log.plateNumber, log.vehicleType)}
                            className="text-xs h-8 px-2 bg-primary/10 text-primary hover:bg-primary/20 font-semibold"
                            title="Thêm biển số này vào danh mục xe được phép"
                          >
                            <Plus className="w-3.5 h-3.5 mr-0.5" />
                            Đăng ký xe
                          </Button>
                        )}
                        {userRole === 'admin' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setLogToDelete(log)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Xóa bản ghi này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="block md:hidden divide-y divide-border">
          {filteredLogs.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Chưa có lượt xe nào trong nhật ký</div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-3.5 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-zinc-950 px-2 py-0.5 rounded border border-red-500/40 text-white font-mono font-bold text-sm tracking-wide">
                      {log.plateNumber}
                    </div>
                    {log.isMatch ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                        Đã đăng ký
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
                        Ngoài danh mục
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground" suppressHydrationWarning>
                    {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
                  <div>
                    Tài xế:{' '}
                    <span className="text-foreground font-medium">
                      {log.matchedVehicle?.driverName || 'Chưa đăng ký'}
                    </span>
                  </div>
                  <div>
                    Phương tiện:{' '}
                    <span className="text-foreground">{log.matchedVehicle?.vehicleType || log.vehicleType}</span>
                  </div>
                  <div>
                    Vị trí: <span className="text-foreground font-mono">{log.locationTag || 'CAN - KHU SUA CHUA'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendTelegram(log)}
                      className={`h-8 text-xs px-2.5 border-sky-500/40 text-sky-600 dark:text-sky-400 ${userRole !== 'admin' ? 'hidden' : ''}`}
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      Telegram
                    </Button>
                    {!log.isMatch && onAddVehiclePrompt && userRole === 'admin' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onAddVehiclePrompt(log.plateNumber, log.vehicleType)}
                        className="h-8 text-xs px-2 bg-primary/10 text-primary font-medium"
                      >
                        + Đăng ký
                      </Button>
                    )}
                  </div>
                  {userRole === 'admin' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setLogToDelete(log)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Xóa dòng"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dialog: Delete single log confirmation */}
      <Dialog open={Boolean(logToDelete)} onOpenChange={(open) => !open && setLogToDelete(null)}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Xóa Bản Ghi Nhật Ký
            </DialogTitle>
            <DialogDescription className="text-xs">
              Bạn có chắc muốn xóa bản ghi xe biển số{' '}
              <strong className="text-foreground">{logToDelete?.plateNumber}</strong> khỏi nhật ký?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLogToDelete(null)} disabled={isDeleting}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => logToDelete && handleDeleteSingleLog(logToDelete.id)}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              Xóa bản ghi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Clear all logs confirmation */}
      <Dialog open={isClearModalOpen} onOpenChange={setIsClearModalOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Xác Nhận Xóa Toàn Bộ Nhật Ký
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tất cả các bản ghi đối soát nhận diện biển số xe hiện tại sẽ bị xóa sạch khỏi bộ nhớ hệ thống.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsClearModalOpen(false)} disabled={isDeleting}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleClearAllLogs} disabled={isDeleting}>
              {isDeleting && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              Xác nhận xóa hết
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
