"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations, useLocale } from "next-intl";
import {
  Clock,
  Plus,
  Edit,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  format,
  startOfWeek,
  addDays,
  subWeeks,
  addWeeks,
  isSameDay,
  parseISO,
  getDay,
} from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { useSalonContext } from "@/contexts/SalonContext";

// --- Types ---

interface StaffSchedule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  date?: string;
  staff: {
    id: string;
    name: string;
    salon: {
      id: string;
      name: string;
    };
  };
}

interface SalonWorkingHours {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isOpen: boolean;
}

interface Staff {
  id: string;
  name: string;
}

const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0] as const;

// --- Schema ---

const scheduleSchema = z
  .object({
    staffId: z.string().min(1, "Vui lòng chọn nhân viên"),
    scheduleMode: z.enum(["weekly", "single", "range"]), // weekly = lặp lại hàng tuần, single = 1 ngày, range = từ ngày - đến ngày
    selectedDays: z.array(z.number()).optional(), // Chỉ dùng khi mode = 'weekly'
    startTime: z
      .string()
      .regex(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Giờ bắt đầu không hợp lệ (HH:mm)",
      ),
    endTime: z
      .string()
      .regex(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Giờ kết thúc không hợp lệ (HH:mm)",
      ),
    breakStart: z
      .string()
      .regex(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Giờ nghỉ bắt đầu không hợp lệ",
      )
      .optional()
      .nullable()
      .or(z.literal("")),
    breakEnd: z
      .string()
      .regex(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Giờ nghỉ kết thúc không hợp lệ",
      )
      .optional()
      .nullable()
      .or(z.literal("")),
    date: z.string().optional().nullable(), // Chỉ dùng khi mode = 'single'
    dateRangeStart: z.string().optional().nullable(), // Chỉ dùng khi mode = 'range'
    dateRangeEnd: z.string().optional().nullable(), // Chỉ dùng khi mode = 'range'
    isAllDay: z.boolean().optional(),
    hasBreak: z.boolean().optional(),
    isOffDay: z.boolean().optional(), // Đánh dấu nghỉ (override lịch hàng tuần)
  })
  .refine(
    (data) => {
      // Validate based on mode
      if (
        data.scheduleMode === "weekly" &&
        (!data.selectedDays || data.selectedDays.length === 0)
      ) {
        return false;
      }
      if (data.scheduleMode === "single" && !data.date) {
        return false;
      }
      if (data.scheduleMode === "range") {
        if (!data.dateRangeStart || !data.dateRangeEnd) {
          return false;
        }
        const start = new Date(data.dateRangeStart);
        const end = new Date(data.dateRangeEnd);
        if (end < start) {
          return false;
        }
      }
      return true;
    },
    {
      message: "Vui lòng điền đầy đủ thông tin ngày áp dụng",
      path: ["scheduleMode"],
    },
  )
  .refine(
    (data) => {
      // Nếu là ngày nghỉ, cho phép startTime = endTime
      if (data.isOffDay) return true;

      const [startHour, startMin] = data.startTime.split(":").map(Number);
      const [endHour, endMin] = data.endTime.split(":").map(Number);
      const start = startHour * 60 + startMin;
      const end = endHour * 60 + endMin;
      return end > start;
    },
    {
      message: "Giờ kết thúc phải lớn hơn giờ bắt đầu",
      path: ["endTime"],
    },
  )
  .refine(
    (data) => {
      if (data.hasBreak && data.breakStart && data.breakEnd) {
        const [breakStartHour, breakStartMin] = data.breakStart
          .split(":")
          .map(Number);
        const [breakEndHour, breakEndMin] = data.breakEnd
          .split(":")
          .map(Number);
        const [startHour, startMin] = data.startTime.split(":").map(Number);
        const [endHour, endMin] = data.endTime.split(":").map(Number);

        const breakStart = breakStartHour * 60 + breakStartMin;
        const breakEnd = breakEndHour * 60 + breakEndMin;
        const start = startHour * 60 + startMin;
        const end = endHour * 60 + endMin;

        return breakEnd > breakStart && breakStart >= start && breakEnd <= end;
      }
      return true;
    },
    {
      message: "Giờ nghỉ phải nằm trong giờ làm việc",
      path: ["breakEnd"],
    },
  );

type ScheduleFormData = z.infer<typeof scheduleSchema>;

// --- Main Component ---

const dateLocaleMap = { vi, en: enUS } as const;

export default function WorkSchedulePage() {
  const t = useTranslations("DashboardPages.workSchedule");
  const locale = useLocale();
  const dateLocale = (dateLocaleMap as Record<string, typeof enUS>)[locale] || enUS;
  const DAYS = [
    { value: 1, label: t("dayMon") },
    { value: 2, label: t("dayTue") },
    { value: 3, label: t("dayWed") },
    { value: 4, label: t("dayThu") },
    { value: 5, label: t("dayFri") },
    { value: 6, label: t("daySat") },
    { value: 0, label: t("daySun") },
  ];
  // Use salon from global context (selected in header)
  const { selectedSalonId, loading: salonLoading } = useSalonContext();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [workingHours, setWorkingHours] = useState<SalonWorkingHours[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<StaffSchedule | null>(
    null,
  );
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  // For selecting days in modal
  const [selectedDaysInModal, setSelectedDaysInModal] = useState<number[]>([]);

  // Salon Hours Modal State
  const [editingSalonHours, setEditingSalonHours] = useState(false);
  const [tempWorkingHours, setTempWorkingHours] = useState<SalonWorkingHours[]>(
    [],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      selectedDays: [],
      scheduleMode: "weekly",
      isOffDay: false,
    },
  });

  // --- Calculations ---

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
  const weekDays = Array.from({ length: 7 }).map((_, i) =>
    addDays(weekStart, i),
  );

  // --- Effects ---

  useEffect(() => {
    if (selectedSalonId) {
      fetchData();
    }
  }, [selectedSalonId, currentDate]); // Refetch if date changes or salon changes

  // --- Data Fetching ---

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchStaff(), fetchWorkingHours(), fetchSchedules()]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    if (!selectedSalonId) return;
    const res = await fetch(`/api/salon/${selectedSalonId}/staff`);
    if (res.ok) {
      const data = await res.json();
      setStaff(data.staff || []);
    }
  };

  const fetchWorkingHours = async () => {
    if (!selectedSalonId) return;
    const res = await fetch(`/api/salon/${selectedSalonId}/working-hours`);
    if (res.ok) {
      const data = await res.json();
      setWorkingHours(data.workingHours || []);
    }
  };

  const fetchSchedules = async () => {
    if (!selectedSalonId) return;
    const params = new URLSearchParams();
    params.append("salonId", selectedSalonId);
    // Optional: Filter by date range to optimize
    const res = await fetch(`/api/schedules?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setSchedules(data.schedules || []);
    }
  };

  // --- Handlers ---

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());
  const handleCellClick = (
    staffId: string,
    day: Date,
    currentSchedule?: StaffSchedule,
  ) => {
    if (currentSchedule) {
      // Edit existing
      setEditingSchedule(currentSchedule);
      setSelectedDaysInModal([currentSchedule.dayOfWeek]);
      const hasDate = !!currentSchedule.date;
      const isOffDay =
        currentSchedule.startTime === "00:00" &&
        currentSchedule.endTime === "00:00";
      reset({
        staffId: staffId,
        scheduleMode: hasDate ? "single" : "weekly",
        selectedDays: hasDate ? [] : [currentSchedule.dayOfWeek],
        startTime: isOffDay ? "00:00" : currentSchedule.startTime,
        endTime: isOffDay ? "00:00" : currentSchedule.endTime,
        breakStart: currentSchedule.breakStart || "",
        breakEnd: currentSchedule.breakEnd || "",
        date: currentSchedule.date
          ? new Date(currentSchedule.date).toISOString().split("T")[0]
          : "",
        dateRangeStart: "",
        dateRangeEnd: "",
        isAllDay:
          currentSchedule.startTime === "00:00" &&
          currentSchedule.endTime === "23:59" &&
          !isOffDay,
        hasBreak: !!(currentSchedule.breakStart && currentSchedule.breakEnd),
        isOffDay: isOffDay,
      });
    } else {
      // Create new for this day
      setEditingSchedule(null);
      const dayOfWeek = getDay(day);
      setSelectedDaysInModal([dayOfWeek]);
      reset({
        staffId: staffId,
        scheduleMode: "weekly",
        selectedDays: [dayOfWeek],
        startTime: "00:00",
        endTime: "23:59",
        breakStart: "",
        breakEnd: "",
        date: "",
        dateRangeStart: "",
        dateRangeEnd: "",
        isAllDay: true, // Default to all day
        hasBreak: false,
        isOffDay: false,
      });
    }
    setShowModal(true);
  };

  const onSubmit = async (data: ScheduleFormData) => {
    setFormLoading(true);
    setFormError("");

    // Sanitize data
    const submissionData: any = {
      staffId: data.staffId,
      // Nếu là ngày nghỉ, set startTime = endTime = "00:00" để đánh dấu nghỉ
      startTime: data.isOffDay ? "00:00" : data.startTime,
      endTime: data.isOffDay ? "00:00" : data.endTime,
      breakStart: data.isOffDay
        ? null
        : data.hasBreak
          ? data.breakStart || null
          : null,
      breakEnd: data.isOffDay
        ? null
        : data.hasBreak
          ? data.breakEnd || null
          : null,
    };

    try {
      if (editingSchedule) {
        // Update - only single schedule
        const dayOfWeek =
          data.scheduleMode === "weekly" && data.selectedDays?.[0] !== undefined
            ? data.selectedDays[0]
            : editingSchedule.dayOfWeek;
        const date =
          data.scheduleMode === "single"
            ? data.date
            : data.scheduleMode === "range"
              ? null
              : editingSchedule.date;

        const res = await fetch(`/api/schedules/${editingSchedule.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...submissionData, dayOfWeek, date }),
        });
        if (!res.ok) throw new Error("Failed to update");
      } else {
        // Create - handle different modes
        if (data.scheduleMode === "weekly") {
          // Create for each selected day of week
          const promises = (data.selectedDays || []).map((dayOfWeek) =>
            fetch("/api/schedules", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...submissionData,
                dayOfWeek,
                date: null,
              }),
            }),
          );
          await Promise.all(promises);
        } else if (data.scheduleMode === "single") {
          // Create for single date
          if (!data.date) throw new Error("Vui lòng chọn ngày");
          const dateObj = new Date(data.date);
          const dayOfWeek = dateObj.getDay();
          await fetch("/api/schedules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...submissionData,
              dayOfWeek,
              date: data.date,
            }),
          });
        } else if (data.scheduleMode === "range") {
          // Create for each day in date range
          if (!data.dateRangeStart || !data.dateRangeEnd)
            throw new Error("Vui lòng chọn từ ngày và đến ngày");
          const startDate = new Date(data.dateRangeStart);
          const endDate = new Date(data.dateRangeEnd);

          if (endDate < startDate)
            throw new Error("Ngày kết thúc phải lớn hơn ngày bắt đầu");

          const promises: Promise<Response>[] = [];
          const currentDate = new Date(startDate);

          while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            const dateStr = currentDate.toISOString().split("T")[0];
            promises.push(
              fetch("/api/schedules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...submissionData,
                  dayOfWeek,
                  date: dateStr,
                }),
              }),
            );
            currentDate.setDate(currentDate.getDate() + 1);
          }

          await Promise.all(promises);
        }
      }
      setShowModal(false);
      fetchSchedules();
    } catch (e: any) {
      setFormError(e.message || "Error occurred");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingSchedule) return;
    if (!confirm(t("confirmDelete"))) return;
    try {
      await fetch(`/api/schedules/${editingSchedule.id}`, { method: "DELETE" });
      setShowModal(false);
      fetchSchedules();
    } catch (e) {
      alert(t("errorDelete"));
    }
  };

  const handleUpdateTempSalonHours = (
    dayValue: number,
    updates: Partial<SalonWorkingHours>,
  ) => {
    setTempWorkingHours((prev) => {
      return prev.map((p) =>
        p.dayOfWeek === dayValue ? { ...p, ...updates } : p,
      );
    });
  };

  const saveSalonHours = async () => {
    if (!selectedSalonId) return;
    setFormLoading(true);
    try {
      const promises = tempWorkingHours.map((wh) =>
        fetch(`/api/salon/${selectedSalonId}/working-hours`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(wh),
        }),
      );
      await Promise.all(promises);
      setEditingSalonHours(false);
      fetchWorkingHours();
    } catch (e) {
      console.error(e);
      alert(t("errorSaveHours"));
    } finally {
      setFormLoading(false);
    }
  };

  const toggleDayInModal = (val: number) => {
    const current = watch("selectedDays") || [];
    if (current.includes(val))
      setValue(
        "selectedDays",
        current.filter((d) => d !== val),
      );
    else setValue("selectedDays", [...current, val]);
  };

  // --- Render Helpers ---

  const getScheduleForCell = (staffId: string, day: Date) => {
    // Priority: Specific Date > Recurring Day
    const specific = schedules.find(
      (s) =>
        s.staff.id === staffId && s.date && isSameDay(parseISO(s.date), day),
    );
    if (specific) return specific;

    const dayOfWeek = getDay(day);
    const recurring = schedules.find(
      (s) => s.staff.id === staffId && !s.date && s.dayOfWeek === dayOfWeek,
    );

    // Check validity (recurrence often overridden by specific absence/date? Logic might be complex server side, but here we just show what we found)
    // Also check if there's a specific "Off" schedule? (Maybe breakStart/End empty means something?)

    return recurring;
  };

  const getSalonHoursForDay = (day: Date) => {
    const dayOfWeek = getDay(day);
    return workingHours.find((wh) => wh.dayOfWeek === dayOfWeek);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("title")}
        </h1>

        <div className="bg-white rounded-lg shadow-sm border p-1 flex items-center">
          <button
            onClick={handlePrevWeek}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="px-4 font-medium min-w-[200px] text-center">
            {format(weekStart, "dd.MM.yyyy")} –{" "}
            {format(addDays(weekStart, 6), "dd.MM.yyyy")}
          </span>
          <button
            onClick={handleNextWeek}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading || salonLoading || !selectedSalonId ? (
        <div className="text-center py-12">{t("loading")}</div>
      ) : (
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          {/* Grid Container */}
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              {/* Header Row */}
              <div className="grid grid-cols-[250px_repeat(7,1fr)] bg-gray-50 border-b">
                <div className="p-4 font-medium text-gray-500">{t("openingHours")}</div>
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className="p-4 text-center border-l"
                  >
                    <div className="font-medium text-gray-900">
                      {format(day, "EEEE", { locale: dateLocale })}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(day, "dd.MM")}
                    </div>
                  </div>
                ))}
              </div>

              {/* Salon Hours Row */}
              <div className="grid grid-cols-[250px_repeat(7,1fr)] border-b bg-gray-50/50">
                <div className="p-4 font-medium text-gray-900 flex items-center justify-between gap-2 group">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                      <Clock className="w-4 h-4" />
                    </div>
                    {t("openingHours")}
                  </div>
                  <button
                    onClick={() => {
                      const defaultHours = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
                        dayOfWeek: d,
                        startTime: "09:00",
                        endTime: "19:00",
                        isOpen: true,
                      }));
                      const merged = defaultHours.map((d) => {
                        const existing = workingHours.find(
                          (w) => w.dayOfWeek === d.dayOfWeek,
                        );
                        return existing || d;
                      });
                      setTempWorkingHours(merged);
                      setEditingSalonHours(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-white rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    title={t("editOpeningHours")}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
                {weekDays.map((day) => {
                  const hours = getSalonHoursForDay(day);
                  return (
                    <div
                      key={day.toISOString()}
                      className="p-4 text-center border-l text-sm text-gray-600 flex items-center justify-center"
                    >
                      {hours && hours.isOpen ? (
                        <span>
                          {hours.startTime} - {hours.endTime}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">{t("closed")}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Staff Rows */}
              {staff.map((s) => (
                <div
                  key={s.id}
                  className="grid grid-cols-[250px_repeat(7,1fr)] border-b hover:bg-gray-50 transition-colors group"
                >
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-500">{t("staffLabel")}</div>
                    </div>
                  </div>

                  {weekDays.map((day) => {
                    const schedule = getScheduleForCell(s.id, day);
                    const isClosed = !getSalonHoursForDay(day)?.isOpen;

                    return (
                      <div
                        key={day.toISOString()}
                        className={`
                                   p-4 border-l text-center cursor-pointer transition-all relative
                                   ${isClosed ? "bg-gray-50/50" : "hover:bg-primary-50"}
                                   ${schedule ? "bg-white" : ""}
                                `}
                        onClick={() => handleCellClick(s.id, day, schedule)}
                      >
                        {schedule ? (
                          <div className="inline-flex flex-col items-center">
                            {schedule.startTime === "00:00" &&
                            schedule.endTime === "00:00" ? (
                              <span className="font-medium text-sm text-red-600">
                                {t("off")}
                              </span>
                            ) : (
                              <>
                                <span className="font-medium text-sm">
                                  {schedule.startTime} - {schedule.endTime}
                                </span>
                                {schedule.breakStart && (
                                  <span className="text-xs text-gray-400 mt-1">
                                    {t("breakLabel")}: {schedule.breakStart}-
                                    {schedule.breakEnd}
                                  </span>
                                )}
                              </>
                            )}
                            {!schedule.date && (
                              <span
                                className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-400"
                                title={t("recurringHint")}
                              ></span>
                            )}
                          </div>
                        ) : (
                          !isClosed && (
                            <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <Plus className="w-4 h-4 text-gray-400" />
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {staff.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  {t("noStaff")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Salon Hours Modal */}
      {editingSalonHours && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold">{t("salonHoursTitle")}</h3>
                <p className="text-sm text-gray-500">
                  {t("salonHoursDesc")}
                </p>
              </div>
              <button
                onClick={() => setEditingSalonHours(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6, 0].map((dayValue) => {
                const currentSetting = tempWorkingHours.find(
                  (w) => w.dayOfWeek === dayValue,
                );
                const isOpen = currentSetting ? currentSetting.isOpen : true;
                const startTime = currentSetting?.startTime || "09:00";
                const endTime = currentSetting?.endTime || "19:00";

                return (
                  <div
                    key={dayValue}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="w-32 font-medium">
                      {DAYS.find((d) => d.value === dayValue)?.label}
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isOpen}
                        aria-label={t("open")}
                        onChange={(e) => {
                          // Update local state is tricky without a dedicated form state.
                          // For simplicity in this "inline" approach, we'll create a new array on the fly for saving,
                          // but to support UI interactivity we need a temp state.
                          // Let's defer to a separate component approach in logic if simple state fails,
                          // bu request was to keep it simple. Let's create a Temp state wrapper above.
                          handleUpdateTempSalonHours(dayValue, {
                            isOpen: e.target.checked,
                          });
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-600">{t("open")}</span>
                    </label>

                    {isOpen && (
                      <div className="flex items-center gap-2 ml-auto">
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) =>
                            handleUpdateTempSalonHours(dayValue, {
                              startTime: e.target.value,
                            })
                          }
                          className="border rounded px-2 py-1 text-sm"
                        />
                        <span>-</span>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) =>
                            handleUpdateTempSalonHours(dayValue, {
                              endTime: e.target.value,
                            })
                          }
                          className="border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    )}

                    {!isOpen && (
                      <div className="ml-auto text-sm text-gray-400 italic">
                        {t("closed")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setEditingSalonHours(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                {t("cancel")}
              </button>
              <button
                onClick={saveSalonHours}
                disabled={formLoading}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {formLoading ? t("saving") : t("saveChanges")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Logic */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 m-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">
                {editingSchedule ? t("editSchedule") : t("addShift")}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-600 p-3 rounded">
                  {formError}
                </div>
              )}

              {/* Schedule Mode Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("applyMode")}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="weekly"
                      {...register("scheduleMode")}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">
                      {t("weekly")}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="single"
                      {...register("scheduleMode")}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">
                      {t("singleDay")}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="range"
                      {...register("scheduleMode")}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">
                      {t("dateRange")}
                    </span>
                  </label>
                </div>
              </div>

              {/* Days Selection - Only show for weekly mode */}
              {watch("scheduleMode") === "weekly" && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t("daysOfWeek")}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDayInModal(day.value)}
                        className={`
                                   width-8 h-8 px-3 py-1 rounded text-sm border transition-colors
                                   ${(watch("selectedDays") || []).includes(day.value) ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-700 hover:bg-gray-50"}
                                `}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  {(!watch("selectedDays") ||
                    watch("selectedDays")?.length === 0) && (
                    <p className="text-red-500 text-xs mt-1">
                      {t("selectAtLeastOneDay")}
                    </p>
                  )}
                </div>
              )}

              {/* Single Date - Only show for single mode */}
              {watch("scheduleMode") === "single" && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t("specificDate")}
                  </label>
                  <input
                    type="date"
                    {...register("date")}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  {errors.date && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.date.message}
                    </p>
                  )}
                </div>
              )}

              {/* Date Range - Only show for range mode */}
              {watch("scheduleMode") === "range" && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t("timeRange")}
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        {t("fromDate")}
                      </label>
                      <input
                        type="date"
                        {...register("dateRangeStart")}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                      {errors.dateRangeStart && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.dateRangeStart.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        {t("toDate")}
                      </label>
                      <input
                        type="date"
                        {...register("dateRangeEnd")}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                      {errors.dateRangeEnd && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.dateRangeEnd.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Off Day Toggle - Only show for single or range mode (to override weekly schedule) */}
              {(watch("scheduleMode") === "single" ||
                watch("scheduleMode") === "range") && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="isOffDay"
                    {...register("isOffDay")}
                    onChange={(e) => {
                      register("isOffDay").onChange(e);
                      if (e.target.checked) {
                        setValue("startTime", "00:00");
                        setValue("endTime", "00:00");
                        setValue("hasBreak", false);
                        setValue("breakStart", "");
                        setValue("breakEnd", "");
                      } else {
                        setValue("startTime", "00:00");
                        setValue("endTime", "23:59");
                        setValue("isAllDay", true);
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label
                    htmlFor="isOffDay"
                    className="text-sm font-medium text-gray-700 select-none cursor-pointer"
                  >
                    <span className="text-yellow-700 font-semibold">
                      {t("markOff")}
                    </span>
                    <span className="text-xs text-gray-500 block mt-0.5">
                      {t("markOffHint")}
                    </span>
                  </label>
                </div>
              )}

              {/* All Day Toggle - Only show when not off day */}
              {!watch("isOffDay") && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isAllDay"
                    {...register("isAllDay")}
                    onChange={(e) => {
                      register("isAllDay").onChange(e);
                      if (e.target.checked) {
                        setValue("startTime", "00:00");
                        setValue("endTime", "23:59");
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label
                    htmlFor="isAllDay"
                    className="text-sm font-medium text-gray-700 select-none"
                  >
                    {t("allDay")}
                  </label>
                </div>
              )}

              {/* Time inputs - Hide when off day */}
              {!watch("isOffDay") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t("start")}
                    </label>
                    <input
                      type="time"
                      {...register("startTime")}
                      disabled={watch("isAllDay")}
                      className={`w-full border rounded-lg px-3 py-2 ${watch("isAllDay") ? "bg-gray-100 text-gray-500" : ""}`}
                    />
                    {errors.startTime && (
                      <p className="text-red-500 text-xs">
                        {errors.startTime.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t("end")}
                    </label>
                    <input
                      type="time"
                      {...register("endTime")}
                      disabled={watch("isAllDay")}
                      className={`w-full border rounded-lg px-3 py-2 ${watch("isAllDay") ? "bg-gray-100 text-gray-500" : ""}`}
                    />
                    {errors.endTime && (
                      <p className="text-red-500 text-xs">
                        {errors.endTime.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Break Time Toggle - Only show when not off day */}
              {!watch("isOffDay") && (
                <div>
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      {...register("hasBreak")}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700 select-none">
                      {t("addBreak")}
                    </span>
                  </label>

                  {watch("hasBreak") && (
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div>
                        <label className="block text-xs font-medium mb-1 text-gray-500">
                          {t("breakFrom")}
                        </label>
                        <input
                          type="time"
                          {...register("breakStart")}
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-gray-500">
                          {t("to")}
                        </label>
                        <input
                          type="time"
                          {...register("breakEnd")}
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 mt-6 pt-4 border-t">
                {editingSchedule && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg mr-auto"
                >
                  {t("delete")}
                </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {formLoading ? t("saving") : t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
