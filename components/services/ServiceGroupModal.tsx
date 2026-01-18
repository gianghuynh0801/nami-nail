'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Clock, Check } from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

// Duration options matching Treatwell
const DURATION_OPTIONS = [
  { value: 5, label: '5 phút' },
  { value: 10, label: '10 phút' },
  { value: 15, label: '15 phút' },
  { value: 20, label: '20 phút' },
  { value: 25, label: '25 phút' },
  { value: 30, label: '30 phút' },
  { value: 35, label: '35 phút' },
  { value: 40, label: '40 phút' },
  { value: 45, label: '45 phút' },
  { value: 50, label: '50 phút' },
  { value: 55, label: '55 phút' },
  { value: 60, label: '1 Tiêu chuẩn' },
  { value: 65, label: '1 Tiêu chuẩn. 05 phút' },
  { value: 75, label: '1 Tiêu chuẩn. 15 phút' },
  { value: 90, label: '1 Tiêu chuẩn. 30 phút' },
  { value: 120, label: '2 Tiêu chuẩn' },
]

const CLEANUP_OPTIONS = [
  { value: 0, label: 'KHÔNG' },
  { value: 5, label: '5 phút' },
  { value: 10, label: '10 phút' },
  { value: 15, label: '15 phút' },
]

const pricingSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Tên là bắt buộc'),
  duration: z.coerce.number().min(5),
  price: z.coerce.number().min(0),
  specialPrice: z.coerce.number().optional(),
})

const formSchema = z.object({
  name: z.string().min(1, 'Tên dịch vụ là bắt buộc'),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  cleanupTime: z.coerce.number().default(0),
  staffIds: z.array(z.string()),
  pricingOptions: z.array(pricingSchema).min(1, 'Cần ít nhất 1 tùy chọn giá'),
})

type FormData = z.infer<typeof formSchema>

interface ServiceGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  salonId: string
  initialData?: any
}

export default function ServiceGroupModal({
  isOpen,
  onClose,
  onSuccess,
  salonId,
  initialData
}: ServiceGroupModalProps) {
  /* ... inside ServiceGroupModal ... */
  const [activeTab, setActiveTab] = useState('pricing')
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [selectAllStaff, setSelectAllStaff] = useState(false)
  
  // State for Staff Specific Durations: { [staffId]: { [variantIndex]: duration } }
  // We use index because new variants don't have IDs yet.
  // For existing variants, we map them to index based on form fields order.
  const [staffDurations, setStaffDurations] = useState<Record<string, Record<number, number>>>({})
  const [editingStaffDuration, setEditingStaffDuration] = useState<string | null>(null) // staffId being edited

  const { register, control, handleSubmit, reset, watch, setValue, getValues, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      categoryId: '',
      description: '',
      notes: '',
      cleanupTime: 0,
      staffIds: [] as string[],
      pricingOptions: [{ name: '', duration: 30, price: 0, specialPrice: 0 }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'pricingOptions'
  })

  // Watch fields
  const watchStaffIds = watch('staffIds')
  const watchPricingOptions = watch('pricingOptions')

  // Fetch categories and staff
  useEffect(() => {
    if (isOpen && salonId) {
      fetchCategories()
      fetchStaff()
      // If editing, fetch DETAILS including StaffService durations
      if (initialData && initialData.id) {
         fetchGroupDetails(initialData.id)
      }
    }
  }, [isOpen, salonId, initialData])

  const fetchGroupDetails = async (groupId: string) => {
     try {
       // Fetch full details including nested staffServices
       const res = await fetch(`/api/service-groups/${groupId}`)
       if (!res.ok) return
       const group = await res.json()
       
       // Re-map staff services to our structure: { staffId: { index: duration } }
       // We need to match group.services order to form fields order.
       // The form fields are initialized from group.services map in the same order.
       
       const newStaffDurations: Record<string, Record<number, number>> = {}
       
       if (group.services) {
          group.services.forEach((service: any, index: number) => {
             if (service.staffServices) {
                service.staffServices.forEach((ss: any) => {
                   if (!newStaffDurations[ss.staffId]) newStaffDurations[ss.staffId] = {}
                   // Check if duration differs from service default
                   // Or just set it anyway to populate the UI explicitly
                   newStaffDurations[ss.staffId][index] = ss.duration
                })
             }
          })
       }
       setStaffDurations(newStaffDurations)
     } catch (e) {
       console.error('Error details:', e)
     }
  }

  // Reset form when initialData changes (Keep existing logic but reset staff durations too)
  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        categoryId: initialData.categoryId || '',
        description: initialData.description || '',
        notes: initialData.notes || '',
        cleanupTime: initialData.cleanupTime || 0,
        staffIds: initialData.staffIds || [],
        pricingOptions: initialData.services?.length > 0 
          ? initialData.services.map((s: any) => ({
              id: s.id,
              name: s.name,
              duration: s.duration,
              price: s.price,
              specialPrice: s.specialPrice || 0
            }))
          : [{ name: '', duration: 30, price: 0, specialPrice: 0 }]
      })
      if (initialData.categoryId) {
        setTimeout(() => setValue('categoryId', initialData.categoryId), 100)
      }
    } else {
      setStaffDurations({})
      reset({
        name: '',
        categoryId: '',
        description: '',
        notes: '',
        cleanupTime: 0,
        staffIds: [],
        pricingOptions: [{ name: '', duration: 30, price: 0, specialPrice: 0 }]
      })
    }
  }, [initialData, reset, isOpen, setValue])

  // ... (Keep existing fetch functions) ...
  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/salon/${salonId}/service-category`)
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch (e) {
      console.error('Error fetching categories:', e)
    }
  }

  const fetchStaff = async () => {
    try {
      const res = await fetch(`/api/salon/${salonId}/staff`)
      if (res.ok) {
        const data = await res.json()
        setStaff(data.staff || [])
      }
    } catch (e) {
      console.error('Error fetching staff:', e)
    }
  }

  const handleSelectAllStaff = () => {
    if (selectAllStaff) {
      setValue('staffIds', [])
    } else {
      setValue('staffIds', staff.map(s => s.id))
    }
    setSelectAllStaff(!selectAllStaff)
  }

  const toggleStaff = (staffId: string) => {
    const current = watchStaffIds || []
    if (current.includes(staffId)) {
      setValue('staffIds', current.filter(id => id !== staffId))
    } else {
      setValue('staffIds', [...current, staffId])
    }
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const url = initialData 
        ? `/api/service-groups/${initialData.id}`
        : `/api/service-groups`
      
      const method = initialData ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          categoryId: data.categoryId || null,
          cleanupTime: data.cleanupTime || 0,
          staffIds: data.staffIds,
          salonId,
          services: data.pricingOptions,
          staffDurations: staffDurations // Send the map
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.details || 'Failed to save')
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error(error)
      alert(`Lỗi: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }
  
  if (!isOpen) return null

  // Helper for popover
  const currentStaffForEdit = staff.find(s => s.id === editingStaffDuration)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      {/* Main Modal */}
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col relative">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-bold">Dịch vụ</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6 gap-6">
           <button onClick={() => setActiveTab('pricing')} className={`py-3 font-medium border-b-2 text-sm ${activeTab === 'pricing' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>Dịch vụ và giá cả</button>
           <button onClick={() => setActiveTab('description')} className={`py-3 font-medium border-b-2 text-sm ${activeTab === 'description' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>Sự miêu tả</button>
           <button onClick={() => setActiveTab('notes')} className={`py-3 font-medium border-b-2 text-sm ${activeTab === 'notes' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>Chú nhỏ</button>
           <button onClick={() => setActiveTab('booking')} className={`py-3 font-medium border-b-2 text-sm ${activeTab === 'booking' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>Đặt chỗ</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="service-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {activeTab === 'pricing' && (
              <div className="space-y-6">
                {/* Name & Cat */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Chi tiết dịch vụ</label>
                    <input {...register('name')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="Ví dụ: Maniküre" />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Loại điều trị</label>
                    <select {...register('categoryId')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 bg-white">
                      <option value="">-- Chọn danh mục --</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Staff Selection with Config */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2">NV/M - Thành viên nào trong nhóm nhân viên đặt lịch hẹn trực tuyến cho dịch vụ này?</label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={handleSelectAllStaff} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${selectAllStaff ? 'bg-primary-100 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                      {selectAllStaff && <Check className="w-3 h-3" />} Chọn tất cả
                    </button>
                    {staff.map(s => {
                       const isSelected = watchStaffIds?.includes(s.id)
                       return (
                        <div key={s.id} className={`inline-flex items-center rounded-lg border text-sm transition-colors overflow-hidden ${isSelected ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-200'}`}>
                          <button
                            type="button"
                            onClick={() => toggleStaff(s.id)}
                            className={`px-3 py-1.5 flex items-center gap-1.5 hover:bg-opacity-80 ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            {s.name}
                          </button>
                          {isSelected && (
                             <button
                                type="button" 
                                onClick={(e) => { e.stopPropagation(); setEditingStaffDuration(s.id); }}
                                className="px-2 py-1.5 border-l border-primary-200 text-primary-600 hover:bg-primary-100 hover:text-primary-800"
                                title="Chỉnh sửa thời gian"
                             >
                                <Clock className="w-3 h-3" />
                             </button>
                          )}
                        </div>
                       )
                    })}
                  </div>
                </div>

                {/* Pricing Table */}
                <div>
                   <div className="flex items-center justify-between mb-2"><label className="block text-sm text-gray-600">Tùy chọn giá</label></div>
                   <div className="border rounded-lg overflow-hidden">
                     <table className="w-full text-sm">
                       <thead className="bg-gray-50">
                         <tr>
                           <th className="text-left px-3 py-2 text-gray-600 font-medium">Tên</th>
                           <th className="text-left px-3 py-2 text-gray-600 font-medium w-40">Khoảng thời gian</th>
                           <th className="text-left px-3 py-2 text-gray-600 font-medium w-28">Giá</th>
                           <th className="text-left px-3 py-2 text-gray-600 font-medium w-28">Giá đặc biệt</th>
                           <th className="w-10"></th>
                         </tr>
                       </thead>
                       <tbody className="divide-y">
                         {fields.map((field, index) => (
                           <tr key={field.id}>
                             <td className="p-2"><input {...register(`pricingOptions.${index}.name`)} className="w-full px-2 py-1.5 border rounded" placeholder="Ví dụ: không sơn" /></td>
                             <td className="p-2">
                               <select {...register(`pricingOptions.${index}.duration`)} className="w-full px-2 py-1.5 border rounded bg-white">
                                 {DURATION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                               </select>
                             </td>
                             <td className="p-2"><div className="flex items-center gap-1"><input type="number" step="0.01" {...register(`pricingOptions.${index}.price`)} className="w-full px-2 py-1.5 border rounded" /><span className="text-gray-500">€</span></div></td>
                             <td className="p-2"><div className="flex items-center gap-1"><input type="number" step="0.01" {...register(`pricingOptions.${index}.specialPrice`)} className="w-full px-2 py-1.5 border rounded" placeholder="-" /><span className="text-gray-500">€</span></div></td>
                             <td className="p-2">{fields.length > 1 && <button type="button" onClick={() => remove(index)} className="p-1 text-red-400 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                   <button type="button" onClick={() => append({ name: '', duration: 30, price: 0, specialPrice: 0 })} className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"><Plus className="w-4 h-4" /> Thêm tùy chọn giá</button>
                </div>
                
                {/* Cleanup */}
                <div className="max-w-xs">
                  <label className="block text-sm text-gray-600 mb-1">Thời gian dọn dẹp</label>
                  <select {...register('cleanupTime')} className="w-full px-3 py-2 border rounded-lg bg-white">
                    {CLEANUP_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>
            )}
            
            {activeTab === 'description' && (
              <div><label className="block text-sm text-gray-600 mb-1">Mô tả dịch vụ</label><textarea {...register('description')} rows={6} className="w-full px-4 py-2 border rounded-lg" /></div>
            )}
            {activeTab === 'notes' && (
              <div><label className="block text-sm text-gray-600 mb-1">Ghi chú</label><textarea {...register('notes')} rows={6} className="w-full px-4 py-2 border rounded-lg" /></div>
            )}
            {activeTab === 'booking' && <div className="text-gray-500 text-center py-8">Cài đặt đặt chỗ sẽ có sớm...</div>}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-between items-center bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg">Hủy bỏ</button>
          <button type="submit" form="service-form" disabled={loading} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">{loading ? 'Đang lưu...' : 'Lưu'}</button>
        </div>
        
        {/* Staff Duration Settings Popover/Overlay */}
        {editingStaffDuration && currentStaffForEdit && (
           <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl" onClick={(e) => { e.stopPropagation(); setEditingStaffDuration(null); }}>
              <div className="bg-white p-6 rounded-lg shadow-2xl border w-96 max-w-full" onClick={e => e.stopPropagation()}>
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Thời gian: {currentStaffForEdit.name}</h3>
                    <button onClick={() => setEditingStaffDuration(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4"/></button>
                 </div>
                 <p className="text-sm text-gray-500 mb-4">Điều chỉnh thời gian thực hiện dịch vụ riêng cho nhân viên này.</p>
                 
                 <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {watchPricingOptions.map((opt, index) => {
                       const currentDuration = staffDurations[editingStaffDuration]?.[index] ?? opt.duration
                       return (
                         <div key={index} className="flex flex-col gap-1">
                            <span className="text-sm font-medium">{opt.name || `Tùy chọn ${index + 1}`}</span>
                            <select 
                               className="w-full px-2 py-1.5 border rounded text-sm bg-white"
                               value={currentDuration}
                               onChange={(e) => {
                                  const val = parseInt(e.target.value)
                                  setStaffDurations(prev => ({
                                     ...prev,
                                     [editingStaffDuration]: {
                                        ...(prev[editingStaffDuration] || {}),
                                        [index]: val
                                     }
                                  }))
                               }}
                            >
                               {DURATION_OPTIONS.map(o => (
                                 <option key={o.value} value={o.value}>{o.label} {o.value === opt.duration ? '(Mặc định)' : ''}</option>
                               ))}
                            </select>
                         </div>
                       )
                    })}
                 </div>
                 
                 <div className="mt-4 flex justify-end">
                    <button onClick={() => setEditingStaffDuration(null)} className="px-4 py-2 bg-primary-600 text-white rounded text-sm hover:bg-primary-700">Xong</button>
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  )
}
