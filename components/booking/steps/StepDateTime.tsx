"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";
import { parseISO, isValid } from "date-fns";
import { vi } from "date-fns/locale";
import { salonDateLabel, salonTodayISO } from "@/lib/timezone";

interface TimeSlot {
  time: string;
  available: boolean;
  reason?: "booked" | "break" | "closed" | "past";
}

interface StepDateTimeProps {
  salonId: string;
  serviceIds: string[];
  staffId: string;
  isAnyStaff?: boolean;
  salonTimezone?: string;
  selectedDate: string;
  selectedTime: string;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
}

export default function StepDateTime({
  salonId,
  serviceIds,
  staffId,
  isAnyStaff = false,
  salonTimezone,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
}: StepDateTimeProps) {
  const [availableTimes, setAvailableTimes] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [isCustomTime, setIsCustomTime] = useState(false);
  // Today based on salon timezone (avoid client timezone differences)
  const today = salonTodayISO(salonTimezone);

  useEffect(() => {
    if (selectedDate && serviceIds.length > 0 && (staffId || isAnyStaff)) {
      fetchAvailableTimes();
    } else {
      setAvailableTimes([]);
    }
  }, [selectedDate, serviceIds, staffId, isAnyStaff]);

  // Sync custom time
  useEffect(() => {
    if (selectedTime && availableTimes.length > 0) {
      const inList = availableTimes.find((t) => t.time === selectedTime);
      if (!inList) {
        setCustomTime(selectedTime);
        setIsCustomTime(true);
      } else {
        setIsCustomTime(false);
        setCustomTime("");
      }
    }
  }, [selectedTime, availableTimes]);

  const fetchAvailableTimes = async () => {
    if (!selectedDate || serviceIds.length === 0 || (!staffId && !isAnyStaff))
      return;

    setLoading(true);
    try {
      const url = isAnyStaff
        ? `/api/booking/available-times?salonId=${salonId}&serviceIds=${serviceIds.join(",")}&date=${selectedDate}&includeDetails=true`
        : `/api/booking/available-times?salonId=${salonId}&staffId=${staffId}&serviceIds=${serviceIds.join(",")}&date=${selectedDate}&includeDetails=true`;
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok) {
        // Handle both old format (string[]) and new format (TimeSlot[])
        const times = data.times || [];
        if (times.length > 0 && typeof times[0] === "string") {
          // Old format: convert to TimeSlot
          setAvailableTimes(
            times.map((t: string) => ({ time: t, available: true })),
          );
        } else {
          setAvailableTimes(times);
        }
      }
    } catch (error) {
      console.error("Error fetching available times:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeSelect = (time: string) => {
    onSelectTime(time);
    setCustomTime("");
    setIsCustomTime(false);
  };

  const handleCustomTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomTime(val);
    if (val) {
      onSelectTime(val);
      setIsCustomTime(true);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Chọn ngày & giờ
        </h2>
        <p className="text-gray-500">Chọn thời gian bạn muốn đặt lịch</p>
      </div>

      <div className="space-y-4">
        {/* Date Selection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Calendar className="w-4 h-4 text-primary-400" />
            Ngày *
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              onSelectDate(e.target.value);
              onSelectTime("");
            }}
            min={today}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
          />
          {selectedDate && isValid(parseISO(selectedDate)) && (
            <p className="mt-2 text-sm text-gray-600 capitalize">
              {salonDateLabel(selectedDate, salonTimezone, "EEEE, dd/MM/yyyy")}
            </p>
          )}
        </div>

        {/* Time Selection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Clock className="w-4 h-4 text-primary-400" />
            Giờ *
          </label>

          {!selectedDate ||
          serviceIds.length === 0 ||
          (!staffId && !isAnyStaff) ? (
            <div className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-500">
              Vui lòng chọn ngày và dịch vụ trước
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400 mx-auto" />
              <p className="mt-2 text-sm text-gray-500">
                Đang tải khung giờ...
              </p>
            </div>
          ) : availableTimes.length > 0 ? (
            <>
              {/* Time Slots Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
                {availableTimes.map((slot) => (
                  <button
                    key={slot.time}
                    disabled={!slot.available}
                    onClick={() => handleTimeSelect(slot.time)}
                    className={`
                      px-2 py-2.5 rounded-lg text-sm font-medium transition-all
                      ${
                        !slot.available
                          ? "bg-gray-800 text-gray-400 cursor-not-allowed opacity-80"
                          : selectedTime === slot.time && !isCustomTime
                            ? "bg-primary-500 text-white shadow-md transform scale-105"
                            : "bg-gray-100 text-gray-700 hover:bg-primary-50 hover:text-primary-600"
                      }
                    `}
                    title={
                      !slot.available
                        ? slot.reason === "booked"
                          ? "Đã đặt"
                          : "Không khả dụng"
                        : ""
                    }
                  >
                    {slot.time}
                  </button>
                ))}
              </div>

              {/* Custom Time Input */}
              <div className="pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hoặc chọn giờ tùy chỉnh:
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="time"
                    value={customTime}
                    onChange={handleCustomTimeChange}
                    className={`
                      border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none
                      ${isCustomTime && selectedTime ? "border-primary-500 bg-primary-50" : "border-gray-300"}
                    `}
                  />
                  {isCustomTime && (
                    <span className="text-sm text-primary-600 font-medium">
                      Đang chọn
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="w-full px-4 py-3 border border-yellow-300 rounded-xl bg-yellow-50 text-yellow-700">
              Không có khung giờ trống. Vui lòng chọn ngày khác.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
