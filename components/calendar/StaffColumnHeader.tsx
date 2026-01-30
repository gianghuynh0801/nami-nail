"use client";

import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type { CalendarStaff } from "./types";

interface StaffColumnHeaderProps {
  staff: CalendarStaff;
  isActive?: boolean;
  onClick?: () => void;
}

export default function StaffColumnHeader({
  staff,
  isActive = false,
  onClick,
}: StaffColumnHeaderProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipRect, setTooltipRect] = useState({ top: 0, left: 0 });
  const nameRef = useRef<HTMLParagraphElement>(null);

  const appointmentCount = staff.appointments.length;
  const inProgressCount = staff.appointments.filter(
    (a) => a.status === "IN_PROGRESS",
  ).length;

  const statusText =
    appointmentCount === 0
      ? "Chưa có lịch"
      : inProgressCount > 0
        ? `${appointmentCount} lịch · Đang làm`
        : `${appointmentCount} lịch`;

  const workingHoursText = staff.workingHours
    ? `${staff.workingHours.start} - ${staff.workingHours.end}`
    : null;

  const tooltipLines = [
    workingHoursText && `Thời gian: ${workingHoursText}`,
    `Trạng thái: ${statusText}`,
  ]
    .filter(Boolean)
    .join("\n");

  const updateTooltipPosition = useCallback(() => {
    if (!nameRef.current) return;
    const rect = nameRef.current.getBoundingClientRect();
    setTooltipRect({
      left: rect.left + rect.width / 2,
      top: rect.top,
    });
  }, []);

  const handleMouseEnter = () => {
    updateTooltipPosition();
    setShowTooltip(true);
  };

  const handleMouseLeave = () => setShowTooltip(false);

  const tooltipContent = showTooltip && typeof document !== "undefined" && (
    <div
      className="fixed px-2.5 py-1.5 rounded-lg bg-gray-800 text-white text-xs max-w-[180px] shadow-xl pointer-events-none -translate-x-1/2 -translate-y-full"
      style={{
        left: tooltipRect.left,
        top: tooltipRect.top,
        marginTop: -6,
        zIndex: 9999,
      }}
      role="tooltip"
    >
      {workingHoursText && (
        <div className="text-gray-200">Thời gian: {workingHoursText}</div>
      )}
      <div className="text-gray-200">Trạng thái: {statusText}</div>
    </div>
  );

  return (
    <>
      <div
        className={`
          p-2 flex items-center gap-2 cursor-pointer transition-colors min-w-0
          ${isActive ? "bg-primary-100" : "hover:bg-beige-light"}
        `}
        onClick={onClick}
      >
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm shadow-sm"
          style={{ backgroundColor: staff.avatarColor }}
        >
          {staff.name.charAt(0).toUpperCase()}
        </div>

        {/* Name - tooltip render qua portal để nổi trên mọi layer */}
        <div className="flex-1 min-w-0">
          <p
            ref={nameRef}
            className="text-sm font-medium text-gray-900 truncate"
            title={tooltipLines}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {staff.name}
          </p>
        </div>
      </div>
      {showTooltip &&
        typeof document !== "undefined" &&
        createPortal(tooltipContent, document.body)}
    </>
  );
}
