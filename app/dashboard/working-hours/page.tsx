"use client";

import { useState, useEffect } from "react";
import { Clock, Save } from "lucide-react";

interface WorkingHours {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isOpen: boolean;
}

const DAYS = [
  { value: 0, label: "Chủ nhật" },
  { value: 1, label: "Thứ 2" },
  { value: 2, label: "Thứ 3" },
  { value: 3, label: "Thứ 4" },
  { value: 4, label: "Thứ 5" },
  { value: 5, label: "Thứ 6" },
  { value: 6, label: "Thứ 7" },
];

export default function WorkingHoursPage() {
  const [salons, setSalons] = useState<any[]>([]);
  const [selectedSalonId, setSelectedSalonId] = useState<string>("");
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSalons();
  }, []);

  useEffect(() => {
    if (selectedSalonId) {
      fetchWorkingHours();
    }
  }, [selectedSalonId]);

  const fetchSalons = async () => {
    try {
      const res = await fetch("/api/salon");
      if (res.ok) {
        const data = await res.json();
        setSalons(data.salons || []);
        if (data.salons && data.salons.length > 0) {
          setSelectedSalonId(data.salons[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching salons:", error);
    }
  };

  const fetchWorkingHours = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/salon/${selectedSalonId}/working-hours`);
      if (res.ok) {
        const data = await res.json();
        // Initialize with all days
        const hoursMap = new Map<number, WorkingHours>(
          data.workingHours.map((wh: WorkingHours) => [wh.dayOfWeek, wh])
        );
        const allHours = DAYS.map((day): WorkingHours => {
          const existing = hoursMap.get(day.value);
          if (existing) {
            return existing as WorkingHours;
          }
          return {
            id: "",
            dayOfWeek: day.value,
            startTime: "09:00",
            endTime: "18:00",
            isOpen: true,
          };
        });
        setWorkingHours(allHours);
      }
    } catch (error) {
      console.error("Error fetching working hours:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateWorkingHours = (dayOfWeek: number, field: string, value: any) => {
    setWorkingHours((prev) =>
      prev.map((wh) =>
        wh.dayOfWeek === dayOfWeek ? { ...wh, [field]: value } : wh
      )
    );
  };

  const saveWorkingHours = async () => {
    if (!selectedSalonId) return;

    setSaving(true);
    try {
      const promises = workingHours.map((wh) =>
        fetch(`/api/salon/${selectedSalonId}/working-hours`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayOfWeek: wh.dayOfWeek,
            startTime: wh.startTime,
            endTime: wh.endTime,
            isOpen: wh.isOpen,
          }),
        })
      );

      await Promise.all(promises);
      alert("Đã lưu giờ làm việc thành công!");
    } catch (error) {
      console.error("Error saving working hours:", error);
      alert("Có lỗi xảy ra khi lưu giờ làm việc");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Giờ làm việc</h1>
        <button
          onClick={saveWorkingHours}
          disabled={saving || !selectedSalonId}
          className="flex items-center gap-2 px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>

      {/* Salon Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Chọn chi nhánh
        </label>
        <select
          value={selectedSalonId}
          onChange={(e) => setSelectedSalonId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
        >
          <option value="">Chọn chi nhánh</option>
          {salons.map((salon) => (
            <option key={salon.id} value={salon.id}>
              {salon.name}
            </option>
          ))}
        </select>
      </div>

      {/* Working Hours Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ngày
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Giờ mở cửa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Giờ đóng cửa
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {workingHours.map((wh) => {
                const day = DAYS.find((d) => d.value === wh.dayOfWeek);
                return (
                  <tr key={wh.dayOfWeek} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {day?.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wh.isOpen}
                          onChange={(e) =>
                            updateWorkingHours(
                              wh.dayOfWeek,
                              "isOpen",
                              e.target.checked
                            )
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-400"></div>
                        <span className="ml-3 text-sm text-gray-700">
                          {wh.isOpen ? "Mở cửa" : "Đóng cửa"}
                        </span>
                      </label>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="time"
                        value={wh.startTime}
                        onChange={(e) =>
                          updateWorkingHours(
                            wh.dayOfWeek,
                            "startTime",
                            e.target.value
                          )
                        }
                        disabled={!wh.isOpen}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="time"
                        value={wh.endTime}
                        onChange={(e) =>
                          updateWorkingHours(
                            wh.dayOfWeek,
                            "endTime",
                            e.target.value
                          )
                        }
                        disabled={!wh.isOpen}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
