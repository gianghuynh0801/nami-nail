"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import CalendarHeader from "./CalendarHeader";
import TimeColumn from "./TimeColumn";
import StaffColumn from "./StaffColumn";
import StaffColumnHeader from "./StaffColumnHeader";
import WaitingListSidebar from "./WaitingListSidebar";
import NotificationCenter from "./NotificationCenter";
import CurrentTimeLine from "./CurrentTimeLine";
import AppointmentDetailModal from "./AppointmentDetailModal";

import { useCalendarData } from "./hooks/useCalendarData";
import { useCalendarDragDrop } from "./hooks/useCalendarDragDrop";
import { useAutoScroll } from "./hooks/useAutoScroll";
import type { CalendarAppointment, WaitingAppointment } from "./types";

interface StaffCalendarViewProps {
  salonId: string;
  onAddAppointment?: () => void;
  onAppointmentClick?: (appointment: CalendarAppointment) => void;
  onTimeSlotClick?: (staffId: string, time: string, date: Date) => void;
  isAdmin?: boolean;
  /** Tăng giá trị sau khi đặt lịch thành công để calendar tự refetch, không cần F5 */
  refreshTrigger?: number;
}

export default function StaffCalendarView({
  salonId,
  onAddAppointment,
  onAppointmentClick,
  onTimeSlotClick,
  isAdmin = false,
  refreshTrigger = 0,
}: StaffCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showWaitingList, setShowWaitingList] = useState(true);

  const [selectedAppointment, setSelectedAppointment] =
    useState<CalendarAppointment | null>(null);
  const [selectedStaffName, setSelectedStaffName] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    staff,
    waitingList,
    isLoading,
    error,
    refetch,
    moveAppointment,
    assignFromWaitingList,
  } = useCalendarData(salonId, selectedDate);

  // Refetch khi đặt lịch thành công (parent tăng refreshTrigger)
  useEffect(() => {
    if (refreshTrigger > 0) refetch();
  }, [refreshTrigger, refetch]);

  const {
    dragState,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDrop,
    cancelDrag,
  } = useCalendarDragDrop({
    onMoveAppointment: async (appointmentId, newStaffId, newStartTime) => {
      await moveAppointment(appointmentId, newStaffId, newStartTime);
    },
    validateDrop: (staffId) => {
      return staff.some((s) => s.id === staffId);
    },
  });

  // Auto-scroll to current time on mount
  useAutoScroll(scrollContainerRef, selectedDate);

  // Get checked-in appointments from all staff
  const checkedInAppointments = staff.flatMap((s) =>
    s.appointments.filter((apt) => apt.status === "CHECKED_IN"),
  );

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  const handlePrevDay = () => setSelectedDate((prev) => subDays(prev, 1));
  const handleNextDay = () => setSelectedDate((prev) => addDays(prev, 1));
  const handleToday = () => setSelectedDate(new Date());

  const isToday =
    format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  // Handle assign from waiting list
  const handleAssignFromWaitingList = useCallback(
    (appointment: WaitingAppointment, staffId: string, time: string) => {
      assignFromWaitingList(appointment.id, staffId, time);
    },
    [assignFromWaitingList],
  );

  // Handle appointment click - show detail modal
  const handleAppointmentClick = useCallback(
    (appointment: CalendarAppointment) => {
      const staffMember = staff.find((s) => s.id === appointment.staffId);
      setSelectedStaffName(staffMember?.name || "");
      setSelectedAppointment(appointment);

      // Also call external handler if provided
      if (onAppointmentClick) {
        onAppointmentClick(appointment);
      }
    },
    [staff, onAppointmentClick],
  );

  // Handle appointment actions
  const handleCheckIn = useCallback(
    async (appointmentId: string) => {
      try {
        const res = await fetch("/api/shift/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointmentId, salonId }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to check-in appointment");
        }
        // Refresh data after check-in
        refetch();
      } catch (error: any) {
        console.error("Error checking in appointment:", error);
        throw error;
      }
    },
    [salonId, refetch],
  );

  const handleStartAppointment = useCallback(
    async (appointmentId: string) => {
      try {
        const res = await fetch("/api/shift/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointmentId, salonId }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to start appointment");
        }
        // Refresh data after starting
        refetch();
      } catch (error: any) {
        console.error("Error starting appointment:", error);
        throw error;
      }
    },
    [salonId, refetch],
  );

  const handleCompleteAppointment = useCallback(
    async (appointmentId: string) => {
      try {
        const res = await fetch("/api/shift/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId,
            salonId,
          }),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to complete appointment");
        }
        // Refresh data after completing
        refetch();
      } catch (error) {
        console.error("Error completing appointment:", error);
        throw error;
      }
    },
    [salonId, refetch],
  );

  const handleCancelAppointment = useCallback(
    async (appointmentId: string) => {
      try {
        const res = await fetch(`/api/appointments/${appointmentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CANCELLED" }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to cancel appointment");
        }
        refetch();
      } catch (error) {
        console.error("Error canceling appointment:", error);
        throw error;
      }
    },
    [refetch],
  );

  const handleConfirmAppointment = useCallback(
    async (appointmentId: string) => {
      try {
        const res = await fetch(`/api/appointments/${appointmentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CONFIRMED" }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to confirm appointment");
        }
        // Refresh data after confirming
        refetch();
      } catch (error: any) {
        console.error("Error confirming appointment:", error);
        throw error;
      }
    },
    [refetch],
  );

  // Handle drop from waiting list drag
  const handleWaitingListDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const appointmentId = e.dataTransfer.getData("appointmentId");
      if (appointmentId && dragState.dropTarget) {
        assignFromWaitingList(
          appointmentId,
          dragState.dropTarget.staffId,
          dragState.dropTarget.time,
        );
      }
    },
    [assignFromWaitingList, dragState.dropTarget],
  );

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-beige-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto" />
          <p className="mt-4 text-gray-600">Đang tải lịch...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-beige-light">
        <div className="text-center">
          <p className="text-red-500 mb-2">❌ {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col bg-beige-light">
        <CalendarHeader
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          onToday={handleToday}
          showWaitingList={showWaitingList}
          onToggleWaitingList={() => setShowWaitingList(!showWaitingList)}
          waitingCount={waitingList.length}
          onAddAppointment={onAddAppointment}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 mb-2">Chưa có nhân viên nào</p>
            <p className="text-sm text-gray-400">
              Vui lòng thêm nhân viên vào salon
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-beige-light relative">
      {/* Header */}
      <CalendarHeader
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        onPrevDay={handlePrevDay}
        onNextDay={handleNextDay}
        onToday={handleToday}
        showWaitingList={showWaitingList}
        onToggleWaitingList={() => setShowWaitingList(!showWaitingList)}
        waitingCount={waitingList.length}
        onAddAppointment={onAddAppointment}
      />

      {/* Notification Center */}
      <NotificationCenter appointments={checkedInAppointments} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Calendar Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Staff Headers (sticky) */}
          <div className="flex border-b border-beige-dark bg-white sticky top-0 z-20 flex-shrink-0">
            {/* Time column header spacer */}
            <div className="w-16 md:w-20 flex-shrink-0 border-r border-beige-dark bg-beige-light" />

            {/* Staff column headers - full width, chia đều theo số nhân viên */}
            <div className="flex-1 min-w-0 pb-2 flex">
              {staff.map((s) => (
                <div
                  key={s.id}
                  className="flex-1 min-w-0 border-r border-beige-dark"
                >
                  <StaffColumnHeader staff={s} />
                </div>
              ))}
            </div>

            {/* Spacer for scrollbar alignment if sidebar is shown */}
            {showWaitingList && <div className="w-0 lg:w-72 flex-shrink-0" />}
          </div>

          {/* Scrollable Calendar Body */}
          <div className="flex-1 flex overflow-hidden">
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto relative"
              onDrop={handleWaitingListDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="flex min-h-full">
                {/* Time Column */}
                <TimeColumn />

                {/* Staff Columns Container - full width, chia đều theo số nhân viên */}
                <div className="flex-1 min-w-0 pb-2 flex relative">
                  {staff.map((s) => (
                    <StaffColumn
                      key={s.id}
                      staff={s}
                      selectedDate={selectedDate}
                      dragState={dragState}
                      onDragStart={handleDragStart}
                      onDrop={handleDrop}
                      onAppointmentClick={handleAppointmentClick}
                      onTimeSlotClick={onTimeSlotClick}
                    />
                  ))}

                  {/* Current Time Line */}
                  {isToday && <CurrentTimeLine />}
                </div>
              </div>
            </div>

            {/* Một bảng "Danh sách chờ" duy nhất: đã check-in + chờ xác nhận */}
            {showWaitingList && (
              <div className="hidden lg:block flex-shrink-0">
                <WaitingListSidebar
                  appointments={waitingList}
                  staff={staff}
                  onAssign={handleAssignFromWaitingList}
                  onClose={() => setShowWaitingList(false)}
                  checkedInAppointments={checkedInAppointments}
                  onStartAppointment={handleStartAppointment}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      {dragState.isDragging && dragState.draggedAppointment && (
        <div
          className="fixed pointer-events-none z-50 w-40"
          style={{
            left: dragState.dragPosition.x - 80,
            top: dragState.dragPosition.y - 20,
          }}
        >
          <div className="bg-primary-400 text-white rounded-lg p-2 shadow-xl opacity-90 border-2 border-primary-500">
            <p className="text-sm font-medium truncate">
              {dragState.draggedAppointment.customerName}
            </p>
            <p className="text-xs opacity-90">
              {dragState.draggedAppointment.service.name}
            </p>
          </div>
        </div>
      )}

      {/* Mobile: Bottom Waiting List Button */}
      <div className="lg:hidden fixed bottom-4 right-4 z-30">
        <button
          onClick={() => setShowWaitingList(!showWaitingList)}
          className="bg-primary-400 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 hover:bg-primary-500 transition-colors"
        >
          <span>📋</span>
          <span className="font-medium">Chờ ({waitingList.length})</span>
        </button>
      </div>

      {/* Mobile: Waiting List Bottom Sheet */}
      {showWaitingList && (
        <div className="lg:hidden fixed inset-0 z-40">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowWaitingList(false)}
          />

          {/* Bottom Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] flex flex-col animate-slide-up">
            <WaitingListSidebar
              appointments={waitingList}
              staff={staff}
              onAssign={handleAssignFromWaitingList}
              onClose={() => setShowWaitingList(false)}
            />
          </div>
        </div>
      )}

      {/* Appointment Detail Modal */}
      <AppointmentDetailModal
        salonId={salonId}
        staffList={staff}
        appointment={selectedAppointment}
        staffName={selectedStaffName}
        isOpen={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onCheckIn={handleCheckIn}
        onStart={handleStartAppointment}
        onComplete={handleCompleteAppointment}
        onCancel={handleCancelAppointment}
        onConfirm={handleConfirmAppointment}
        onUpdate={refetch}
        isAdmin={isAdmin}
      />

      {/* Drag Overlay */}
      {dragState.isDragging && dragState.draggedAppointment && (
        <div
          className="fixed z-50 pointer-events-none p-3 bg-white rounded-lg shadow-xl border border-primary-200 opacity-90 w-48 animate-pulse"
          style={{
            left: dragState.dragPosition.x,
            top: dragState.dragPosition.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          <p className="font-bold text-sm text-gray-900 truncate">
            {dragState.draggedAppointment.customerName}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {dragState.draggedAppointment.service.name}
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs text-primary-600 font-medium">
            ⏱️ {dragState.draggedAppointment.service.duration}p
          </div>
        </div>
      )}
    </div>
  );
}
