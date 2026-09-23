'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Truck,
  Plus,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Download,
  Upload,
  FileSpreadsheet,
  RotateCcw,
  Shield,
  FileText,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Vehicle, UserRole } from '@/lib/types'
import { useRealtimeSync } from '@/lib/hooks/use-realtime-sync'
import { toast } from 'sonner'

interface VehicleManagementProps {
  userRole?: UserRole
  onFleetUpdated?: (vehicles: Vehicle[]) => void
  initialPlate?: string
  autoOpenCreate?: boolean
}

export function VehicleManagement({
  userRole = 'admin',
  onFleetUpdated,
  initialPlate,
  autoOpenCreate = false,
}: VehicleManagementProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'blacklisted'>('all')

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentId, setCurrentId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    plateNumber: '',
    driverName: '',
    vehicleType: 'Xe bồn bê tông Howo 12m³',
    company: 'Bê Tông Xanh Sài Gòn',
    status: 'approved' as 'approved' | 'blacklisted',
    notes: '',
  })

  // Delete Confirmation Modal State (replaces blocked native confirm)
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // File import ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch vehicles
  const fetchVehicles = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setIsLoading(true)
      try {
        const res = await fetch('/api/vehicles')
        if (res.ok) {
          const data = await res.json()
          setVehicles(data.vehicles || [])
          onFleetUpdated?.(data.vehicles || [])
        }
      } catch {
        console.error('Error fetching vehicles')
        if (!isSilent) toast.error('Không thể tải danh mục xe')
      } finally {
        if (!isSilent) setIsLoading(false)
      }
    },
    [onFleetUpdated],
  )

  // Real-time synchronization across all browser tabs and external sessions
  const { broadcastLocally } = useRealtimeSync({
    onVehiclesUpdated: (msg) => {
      fetchVehicles(true)
      if (msg.type === 'vehicles_updated') {
        if (msg.action === 'create') {
          toast.info('Hệ thống vừa cập nhật thêm xe mới vào danh mục')
        } else if (msg.action === 'update') {
          toast.info('Thông tin xe vừa được cập nhật')
        } else if (msg.action === 'delete') {
          toast.info('Một xe vừa được gỡ khỏi danh mục')
        }
      }
    },
    onFullSyncRequired: () => {
      fetchVehicles(true)
    },
  })

  useEffect(() => {
    fetchVehicles()
  }, [fetchVehicles])

  // Auto open create modal if requested with initialPlate
  useEffect(() => {
    if (initialPlate || autoOpenCreate) {
      setIsEditing(false)
      setCurrentId('')
      setFormData({
        plateNumber: initialPlate ? initialPlate.toUpperCase() : '',
        driverName: '',
        vehicleType: 'Xe bồn bê tông Howo 12m³',
        company: 'Bê Tông Xanh Sài Gòn',
        status: 'approved',
        notes: initialPlate ? `Đăng ký từ camera nhận diện biển số ${initialPlate}` : '',
      })
      setIsModalOpen(true)
    }
  }, [initialPlate, autoOpenCreate])

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchSearch =
        v.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.vehicleType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.company.toLowerCase().includes(searchQuery.toLowerCase())
      const matchStatus = statusFilter === 'all' || v.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [vehicles, searchQuery, statusFilter])

  // Open modal for Create
  const handleOpenCreate = () => {
    setIsEditing(false)
    setCurrentId('')
    setFormData({
      plateNumber: '',
      driverName: '',
      vehicleType: 'Xe bồn bê tông Howo 12m³',
      company: 'Bê Tông Xanh Sài Gòn',
      status: 'approved',
      notes: '',
    })
    setIsModalOpen(true)
  }

  // Open modal for Edit
  const handleOpenEdit = (v: Vehicle) => {
    setIsEditing(true)
    setCurrentId(v.id)
    setFormData({
      plateNumber: v.plateNumber,
      driverName: v.driverName,
      vehicleType: v.vehicleType,
      company: v.company,
      status: v.status === 'blacklisted' ? 'blacklisted' : 'approved',
      notes: v.notes || '',
    })
    setIsModalOpen(true)
  }

  // Save vehicle (Add / Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.plateNumber.trim() || !formData.driverName.trim() || !formData.vehicleType.trim()) {
      toast.error('Vui lòng nhập Biển số, Tên tài xế và Loại xe')
      return
    }

    setIsSaving(true)
    try {
      const url = '/api/vehicles'
      const method = isEditing ? 'PUT' : 'POST'
      const payload = isEditing ? { id: currentId, ...formData } : formData

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await res.json()

      if (res.ok) {
        toast.success(isEditing ? 'Cập nhật thông tin xe thành công!' : 'Đã thêm xe mới vào danh mục thành công!')
        setIsModalOpen(false)
        await fetchVehicles(true)
        broadcastLocally({
          type: 'vehicles_updated',
          action: isEditing ? 'update' : 'create',
          timestamp: Date.now(),
        })
      } else {
        toast.error(result.error || 'Có lỗi xảy ra khi lưu xe')
      }
    } catch {
      toast.error('Lỗi kết nối khi lưu xe')
    } finally {
      setIsSaving(false)
    }
  }

  // Quick 1-click Status Toggle (Approved <-> Blacklisted)
  const handleQuickStatusChange = async (vehicle: Vehicle, newStatus: 'approved' | 'blacklisted') => {
    if (userRole !== 'admin') {
      toast.error('Chỉ tài khoản Quản trị viên (Admin) mới có quyền đổi trạng thái xe')
      return
    }

    try {
      const res = await fetch('/api/vehicles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...vehicle, status: newStatus }),
      })

      if (res.ok) {
        const label = newStatus === 'approved' ? 'Cho qua' : 'Chặn'
        toast.success(`Đã đổi trạng thái xe ${vehicle.plateNumber} thành "${label}"`)
        setVehicles((prev) => prev.map((v) => (v.id === vehicle.id ? { ...v, status: newStatus } : v)))
        broadcastLocally({
          type: 'vehicles_updated',
          action: 'update',
          timestamp: Date.now(),
        })
      } else {
        toast.error('Không thể cập nhật trạng thái xe')
      }
    } catch {
      toast.error('Lỗi khi đổi trạng thái xe')
    }
  }

  // Execute Delete from custom modal
  const handleExecuteDelete = async () => {
    if (!vehicleToDelete) return
    const idToDelete = vehicleToDelete.id
    const plateToDelete = vehicleToDelete.plateNumber
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/vehicles?id=${encodeURIComponent(idToDelete)}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(`Đã xóa vĩnh viễn xe ${plateToDelete} khỏi danh mục`)
        setVehicleToDelete(null)
        setVehicles((prev) => {
          const updated = prev.filter((v) => v.id !== idToDelete && v.plateNumber !== plateToDelete)
          onFleetUpdated?.(updated)
          return updated
        })
        await fetchVehicles(true)
        broadcastLocally({
          type: 'vehicles_updated',
          action: 'delete',
          vehicleId: idToDelete,
          timestamp: Date.now(),
        })
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Không thể xóa xe')
      }
    } catch {
      toast.error('Lỗi khi xóa xe')
    } finally {
      setIsDeleting(false)
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    if (vehicles.length === 0) {
      toast.info('Chưa có dữ liệu xe để xuất')
      return
    }

    const headers = ['STT,Biển Số Xe,Tên Tài Xế,Loại Xe,Đơn Vị/Công Ty,Trạng Thái,Ghi Chú,Ngày Đăng Ký']
    const rows = vehicles.map((v, idx) =>
      [
        idx + 1,
        `"${v.plateNumber}"`,
        `"${v.driverName}"`,
        `"${v.vehicleType}"`,
        `"${v.company}"`,
        `"${v.status === 'approved' ? 'Cho qua' : 'Chặn'}"`,
        `"${v.notes || ''}"`,
        `"${new Date(v.registeredAt).toLocaleDateString('vi-VN')}"`,
      ].join(','),
    )

    const csvContent = '\uFEFF' + [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Danh_Sach_Xe_CamerAI_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    toast.success('Đã tải xuống file CSV danh sách xe')
  }

  // Import CSV / File
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      if (!text) return

      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)

      if (lines.length === 0) {
        toast.error('File rỗng, không có dữ liệu xe')
        return
      }

      const parsedVehicles: Partial<Vehicle>[] = []
      // Skip header if it has headers
      const startIndex =
        lines[0].toLowerCase().includes('biển') || lines[0].toLowerCase().includes('plate') ? 1 : 0

      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.replace(/^"|"$/g, '').trim())
        if (parts.length >= 2) {
          const plate = parts[1] || parts[0]
          if (plate && plate.length >= 4) {
            parsedVehicles.push({
              plateNumber: plate.toUpperCase(),
              driverName: parts[2] || parts[1] || 'Tài xế nhập file',
              vehicleType: parts[3] || 'Xe bồn bê tông Howo',
              company: parts[4] || 'Bê Tông Xanh Sài Gòn',
              status: parts[5]?.toLowerCase().includes('chặn') ? 'blacklisted' : 'approved',
              notes: parts[6] || 'Nhập từ file Excel',
            })
          }
        }
      }

      if (parsedVehicles.length === 0) {
        toast.error('Không tìm thấy thông tin xe hợp lệ trong file')
        return
      }

      try {
        const res = await fetch('/api/vehicles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vehicles: parsedVehicles }),
        })

        const data = await res.json()
        if (res.ok) {
          toast.success(`Đã nạp thành công ${data.count || parsedVehicles.length} xe vào hệ thống!`)
          await fetchVehicles()
          broadcastLocally({
            type: 'vehicles_updated',
            action: 'create',
            timestamp: Date.now(),
          })
        } else {
          toast.error(data.error || 'Lỗi khi nhập dữ liệu')
        }
      } catch {
        toast.error('Lỗi kết nối khi gửi dữ liệu nhập lên hệ thống')
      }
    }

    reader.readAsText(file)
    e.target.value = ''
  }

  // Download Sample CSV template
  const handleDownloadTemplate = () => {
    const sample = `STT,Biển Số Xe,Tên Tài Xế,Loại Xe,Đơn Vị/Công Ty,Trạng Thái,Ghi Chú
1,51N-043.57,Lê Văn Hùng,Xe bồn bê tông Howo 12m³,Bê Tông Xanh Sài Gòn,Cho qua,Xe trạm trộn trung tâm
2,50H-123.45,Trần Văn Mạnh,Xe bồn Hyundai HD270 10m³,Bê Tông Xanh Sài Gòn,Cho qua,Tuyến công trình Quận 9
3,60C-892.11,Nguyễn Quốc Tuấn,Xe tải ben Howo 4 chân,Vận tải Đông Nam Bộ,Cho qua,Cung cấp đá dăm cát vàng
4,29C-556.78,Đặng Đình Khoa,Xe tải thùng 8 tấn,Vãng lai chưa đăng ký,Chặn,Cần bảo vệ kiểm tra giấy tờ`
    const blob = new Blob(['\uFEFF' + sample], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'Mau_Danh_Sach_Xe_CamerAI.csv'
    link.click()
    toast.success('Đã tải xuống file mẫu danh sách xe CSV')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv,.txt"
        onChange={handleFileImport}
        className="hidden"
      />

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Truck className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Danh Mục Xe Đăng Ký (Fleet Registry)</h2>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-emerald-500/40 text-emerald-500 bg-emerald-500/10 flex items-center gap-1 py-0.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ĐỒNG BỘ TỨC THỜI ({vehicles.length} XE)
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dữ liệu đối soát tự động khi Camera AI quét và zoom biển số xe vào cổng
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export button */}
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs h-9">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Xuất Excel/CSV
          </Button>

          {/* Admin only actions: Import & Add */}
          {userRole === 'admin' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs h-9 border-border bg-card"
                title="Tải lên danh sách xe từ file CSV"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5 text-primary" />
                Nhập file CSV
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadTemplate}
                className="text-xs h-9 text-muted-foreground hidden sm:flex"
                title="Tải file mẫu Excel/CSV"
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                File mẫu
              </Button>

              <Button size="sm" onClick={handleOpenCreate} className="text-xs h-9 font-medium shadow-sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Thêm xe mới
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo biển số (51N-043.57), tên tài xế, loại xe, đơn vị..."
            className="pl-9 h-10 text-sm bg-card"
          />
        </div>

        <div className="sm:col-span-4 flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
          >
            <option value="all">Tất cả trạng thái ({vehicles.length})</option>
            <option value="approved">Cho qua</option>
            <option value="blacklisted">Chặn</option>
          </select>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchVehicles()}
            title="Tải lại danh sách"
            className="shrink-0"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Vehicle List - Mobile Cards & Desktop Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border font-mono">
              <tr>
                <th className="px-4 py-3">Biển Số Xe</th>
                <th className="px-4 py-3">Tên Tài Xế</th>
                <th className="px-4 py-3">Loại Phương Tiện</th>
                <th className="px-4 py-3">Đơn Vị / Công Ty</th>
                <th className="px-4 py-3">Trạng Thái Cấp Phép</th>
                {userRole === 'admin' && <th className="px-4 py-3 text-right">Thao Tác Quản Trị</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    {searchQuery ? 'Không tìm thấy xe nào khớp với từ khóa tìm kiếm' : 'Chưa có phương tiện nào trong danh mục'}
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                      <div className="inline-flex items-center gap-2 bg-muted/60 px-2.5 py-1 rounded border border-border/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {vehicle.plateNumber}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-foreground">{vehicle.driverName}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{vehicle.vehicleType}</td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{vehicle.company}</td>
                    <td className="px-4 py-3.5">
                      {/* Interactive quick status toggle for Admin, badge for others */}
                      {userRole === 'admin' ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange(vehicle, 'approved')}
                            title="Bấm để Cho qua"
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all border ${
                              vehicle.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 shadow-xs'
                                : 'bg-muted/40 text-muted-foreground border-transparent hover:border-border'
                            }`}
                          >
                            ✓ Cho qua
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange(vehicle, 'blacklisted')}
                            title="Bấm để Chặn vào cổng"
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all border ${
                              vehicle.status === 'blacklisted'
                                ? 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/50 shadow-xs'
                                : 'bg-muted/40 text-muted-foreground border-transparent hover:border-border'
                            }`}
                          >
                            ✕ Chặn
                          </button>
                        </div>
                      ) : (
                        <div>
                          {vehicle.status === 'approved' && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Cho qua
                            </Badge>
                          )}
                          {vehicle.status === 'blacklisted' && (
                            <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-xs">
                              <XCircle className="w-3 h-3 mr-1" />
                              Chặn Cổng
                            </Badge>
                          )}
                        </div>
                      )}
                    </td>
                    {userRole === 'admin' && (
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEdit(vehicle)}
                            title="Chỉnh sửa thông tin xe"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setVehicleToDelete(vehicle)}
                            title="Xóa xe khỏi danh mục"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View - Explicitly Optimized for Touch Phones */}
        <div className="block md:hidden divide-y divide-border">
          {filteredVehicles.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Không tìm thấy phương tiện nào</div>
          ) : (
            filteredVehicles.map((vehicle) => (
              <div key={vehicle.id} className="p-3.5 flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono font-bold text-base text-foreground tracking-wide">
                      {vehicle.plateNumber}
                    </div>
                    <div className="text-sm font-semibold text-foreground mt-0.5">{vehicle.driverName}</div>
                  </div>
                  <div>
                    {vehicle.status === 'approved' && (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px]">
                        Hợp lệ
                      </Badge>
                    )}
                    {vehicle.status === 'blacklisted' && (
                      <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-[11px]">
                        Chặn
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground flex flex-col gap-1">
                  <div>
                    Loại xe: <span className="text-foreground">{vehicle.vehicleType}</span>
                  </div>
                  <div>
                    Đơn vị: <span className="text-foreground">{vehicle.company}</span>
                  </div>
                </div>

                {userRole === 'admin' && (
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleQuickStatusChange(vehicle, 'approved')}
                        className={`text-[10px] px-2 py-1 rounded font-semibold ${
                          vehicle.status === 'approved'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        Cho qua
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickStatusChange(vehicle, 'blacklisted')}
                        className={`text-[10px] px-2 py-1 rounded font-semibold ${
                          vehicle.status === 'blacklisted'
                            ? 'bg-red-500 text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        Chặn
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs px-2.5"
                        onClick={() => handleOpenEdit(vehicle)}
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Sửa
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs px-2 text-destructive hover:bg-destructive/10"
                        onClick={() => setVehicleToDelete(vehicle)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dialog 1: Add or Edit Vehicle Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Truck className="w-5 h-5 text-primary" />
              {isEditing ? 'Cập Nhật Thông Tin Xe' : 'Thêm Xe Mới Vào Hệ Thống'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Nhập thông tin biển số xe, tên tài xế và loại xe để AI tự động nhận dạng khi xe đến cổng.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="plateNumber" className="text-xs font-semibold">
                Biển số xe *
              </Label>
              <Input
                id="plateNumber"
                required
                value={formData.plateNumber}
                onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
                placeholder="Ví dụ: 51N-043.57 hoặc 50H-123.45"
                className="font-mono text-sm tracking-wide"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="driverName" className="text-xs font-semibold">
                Tên tài xế *
              </Label>
              <Input
                id="driverName"
                required
                value={formData.driverName}
                onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                placeholder="Ví dụ: Lê Văn Hùng"
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vehicleType" className="text-xs font-semibold">
                Loại xe *
              </Label>
              <Input
                id="vehicleType"
                required
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                placeholder="Ví dụ: Xe bồn bê tông Howo 12m³, Xe tải ben..."
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="company" className="text-xs font-semibold">
                  Đơn vị / Đội xe
                </Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Bê Tông Xanh Sài Gòn"
                  className="text-sm"
                />
              </div>

            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs font-semibold">
                Trạng thái cấp phép vào cổng
              </Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
              >
                <option value="approved">Cho qua</option>
                <option value="blacklisted">Chặn</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold">
                Ghi chú đặc biệt
              </Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Gắn đèn LED cabin, chở ca đêm, khu vực sửa chữa..."
                className="text-sm"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                {isEditing ? 'Lưu thay đổi' : 'Xác nhận thêm xe'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Delete Confirmation Modal (Reliable, Unblocked) */}
      <Dialog open={Boolean(vehicleToDelete)} onOpenChange={(open) => !open && setVehicleToDelete(null)}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Xác Nhận Xóa Phương Tiện
            </DialogTitle>
            <DialogDescription className="text-xs">
              Hành động này sẽ xóa vĩnh viễn xe khỏi danh mục đối soát của Camera AI.
            </DialogDescription>
          </DialogHeader>

          {vehicleToDelete && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Biển số:</span>
                <span className="font-mono font-bold text-sm text-foreground bg-background px-2 py-0.5 rounded border">
                  {vehicleToDelete.plateNumber}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tài xế:</span>
                <span className="font-semibold text-foreground">{vehicleToDelete.driverName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Loại xe:</span>
                <span className="text-foreground">{vehicleToDelete.vehicleType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Đơn vị:</span>
                <span className="text-foreground">{vehicleToDelete.company}</span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setVehicleToDelete(null)}
              disabled={isDeleting}
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleExecuteDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Xác nhận xóa vĩnh viễn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
