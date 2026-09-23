'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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
  Filter,
  UserCheck,
  Shield,
  Phone,
  FileSpreadsheet,
  RotateCcw,
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
import { toast } from 'sonner'

interface VehicleManagementProps {
  userRole?: UserRole
  onFleetUpdated?: (vehicles: Vehicle[]) => void
}

export function VehicleManagement({ userRole = 'admin', onFleetUpdated }: VehicleManagementProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'restricted' | 'blacklisted'>('all')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentId, setCurrentId] = useState('')
  const [formData, setFormData] = useState({
    plateNumber: '',
    driverName: '',
    vehicleType: 'Xe bồn bê tông Howo 12m³',
    company: 'Bê Tông Xanh Sài Gòn',
    phoneNumber: '',
    status: 'approved' as 'approved' | 'restricted' | 'blacklisted',
    notes: '',
  })

  // Fetch vehicles
  const fetchVehicles = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/vehicles')
      if (res.ok) {
        const data = await res.json()
        setVehicles(data.vehicles || [])
        onFleetUpdated?.(data.vehicles || [])
      }
    } catch {
      console.error('Error fetching vehicles')
      toast.error('Không thể tải danh mục xe')
    } finally {
      setIsLoading(false)
    }
  }, [onFleetUpdated])

  useEffect(() => {
    fetchVehicles()
  }, [fetchVehicles])

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
      phoneNumber: '',
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
      phoneNumber: v.phoneNumber || '',
      status: v.status,
      notes: v.notes || '',
    })
    setIsModalOpen(true)
  }

  // Save vehicle
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.plateNumber.trim() || !formData.driverName.trim() || !formData.vehicleType.trim()) {
      toast.error('Vui lòng nhập Biển số, Tên tài xế và Loại xe')
      return
    }

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
        toast.success(isEditing ? 'Cập nhật xe thành công' : 'Đã thêm xe mới vào danh mục')
        setIsModalOpen(false)
        fetchVehicles()
      } else {
        toast.error(result.error || 'Có lỗi xảy ra')
      }
    } catch {
      toast.error('Lỗi kết nối khi lưu xe')
    }
  }

  // Delete vehicle
  const handleDelete = async (id: string, plate: string) => {
    if (!confirm(`Bạn có chắc muốn xóa xe ${plate} khỏi danh mục?`)) return
    try {
      const res = await fetch(`/api/vehicles?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(`Đã xóa xe ${plate}`)
        fetchVehicles()
      } else {
        toast.error('Không thể xóa xe')
      }
    } catch {
      toast.error('Lỗi khi xóa xe')
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    if (vehicles.length === 0) {
      toast.info('Chưa có dữ liệu xe để xuất')
      return
    }

    const headers = ['STT,Biển Số Xe,Tên Tài Xế,Loại Xe,Đơn Vị/Công Ty,Số Điện Thoại,Trạng Thái,Ghi Chú,Ngày Đăng Ký']
    const rows = vehicles.map((v, idx) =>
      [
        idx + 1,
        `"${v.plateNumber}"`,
        `"${v.driverName}"`,
        `"${v.vehicleType}"`,
        `"${v.company}"`,
        `"${v.phoneNumber || ''}"`,
        `"${v.status === 'approved' ? 'Hợp lệ' : v.status === 'restricted' ? 'Tạm giữ' : 'Chặn'}"`,
        `"${v.notes || ''}"`,
        `"${new Date(v.registeredAt).toLocaleDateString('vi-VN')}"`,
      ].join(',')
    )

    const csvContent = '\uFEFF' + [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Danh_Sach_Xe_CamerAI_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    toast.success('Đã tải xuống file CSV')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Danh Mục Xe Đăng Ký (Fleet Registry)</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dữ liệu đối soát tự động khi Camera AI quét và zoom biển số xe vào cổng
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs h-9">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Xuất Excel/CSV
          </Button>

          {userRole === 'admin' && (
            <Button size="sm" onClick={handleOpenCreate} className="text-xs h-9 font-medium">
              <Plus className="w-4 h-4 mr-1.5" />
              Thêm xe mới
            </Button>
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
            className="pl-9 h-10 text-sm"
          />
        </div>

        <div className="sm:col-span-4 flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
          >
            <option value="all">Tất cả trạng thái ({vehicles.length})</option>
            <option value="approved">Hợp lệ / Cho qua</option>
            <option value="restricted">Tạm hoãn / Kiểm tra</option>
            <option value="blacklisted">Danh sách đen / Chặn</option>
          </select>

          <Button variant="ghost" size="icon" onClick={fetchVehicles} title="Tải lại">
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
                <th className="px-4 py-3">Số Điện Thoại</th>
                <th className="px-4 py-3">Trạng Thái</th>
                {userRole === 'admin' && <th className="px-4 py-3 text-right">Thao Tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    Không tìm thấy phương tiện nào phù hợp
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
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      {vehicle.driverName}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {vehicle.vehicleType}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {vehicle.company}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                      {vehicle.phoneNumber || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {vehicle.status === 'approved' && (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Hợp Lệ (Cho qua)
                        </Badge>
                      )}
                      {vehicle.status === 'restricted' && (
                        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Kiểm Tra
                        </Badge>
                      )}
                      {vehicle.status === 'blacklisted' && (
                        <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-xs">
                          <XCircle className="w-3 h-3 mr-1" />
                          Chặn Cổng
                        </Badge>
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
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(vehicle.id, vehicle.plateNumber)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
            <div className="p-6 text-center text-muted-foreground text-sm">
              Không tìm thấy phương tiện nào
            </div>
          ) : (
            filteredVehicles.map((vehicle) => (
              <div key={vehicle.id} className="p-3.5 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono font-bold text-base text-foreground tracking-wide">
                      {vehicle.plateNumber}
                    </div>
                    <div className="text-sm font-semibold text-foreground mt-0.5">
                      {vehicle.driverName}
                    </div>
                  </div>
                  <div>
                    {vehicle.status === 'approved' && (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px]">
                        Hợp lệ
                      </Badge>
                    )}
                    {vehicle.status === 'restricted' && (
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px]">
                        Kiểm tra
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
                  <div>Loại xe: <span className="text-foreground">{vehicle.vehicleType}</span></div>
                  <div>Đơn vị: <span className="text-foreground">{vehicle.company}</span></div>
                  {vehicle.phoneNumber && <div>SĐT: <span className="text-foreground font-mono">{vehicle.phoneNumber}</span></div>}
                </div>

                {userRole === 'admin' && (
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs px-3"
                      onClick={() => handleOpenEdit(vehicle)}
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Sửa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs px-3 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => handleDelete(vehicle.id, vehicle.plateNumber)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Xóa
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Vehicle Modal */}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div className="space-y-1.5">
                <Label htmlFor="phoneNumber" className="text-xs font-semibold">
                  Số điện thoại
                </Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="0903.xxx.xxx"
                  className="font-mono text-sm"
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
                <option value="approved">Hợp lệ (Tự động mở Barie & ghi nhận)</option>
                <option value="restricted">Kiểm tra (Báo bảo vệ kiểm tra giấy tờ)</option>
                <option value="blacklisted">Danh sách đen (Cấm vào cổng)</option>
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
              <Button type="submit">
                {isEditing ? 'Lưu thay đổi' : 'Xác nhận thêm xe'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
