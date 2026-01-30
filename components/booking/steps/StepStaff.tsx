"use client";

import { useState, useEffect } from "react";
import { Users, User, Shuffle } from "lucide-react";

interface Staff {
  id: string;
  name: string;
}

interface StepStaffProps {
  salonId: string;
  serviceIds: string[];
  staff: Staff[];
  selectedStaffId: string;
  isAnyStaff?: boolean;
  onSelect: (staffId: string, isAnyStaff?: boolean) => void;
}

export default function StepStaff({
  salonId,
  serviceIds,
  staff,
  selectedStaffId,
  isAnyStaff = false,
  onSelect,
}: StepStaffProps) {
  const [availableStaff, setAvailableStaff] = useState<Staff[]>(staff);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // In the future, we can filter staff based on service availability
    // For now, show all staff
    setAvailableStaff(staff);
  }, [staff, serviceIds]);

  const handleSelectAny = () => {
    onSelect("", true);
  };

  const handleSelectStaff = (staffId: string) => {
    onSelect(staffId, false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Chọn Nhân viên
        </h2>
        <p className="text-gray-500">
          Chọn nhân viên phục vụ hoặc để hệ thống tự động phân công
        </p>
      </div>

      {/* Any Staff Option */}
      <button
        onClick={handleSelectAny}
        className={`
          w-full text-left p-4 rounded-xl border-2 transition-all duration-200
          ${
            isAnyStaff
              ? "border-primary-400 bg-primary-50 shadow-md"
              : "border-gray-200 bg-white hover:border-primary-300 hover:shadow-sm"
          }
        `}
      >
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div
            className={`
            w-14 h-14 rounded-full flex items-center justify-center
            ${isAnyStaff ? "bg-primary-400 text-white" : "bg-gradient-to-br from-primary-200 to-primary-300 text-primary-700"}
          `}
          >
            <Shuffle className="w-7 h-7" />
          </div>

          {/* Info */}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Bất kỳ nhân viên</h3>
            <p className="text-sm text-gray-500">
              Hệ thống sẽ tự động chọn nhân viên phù hợp nhất
            </p>
          </div>

          {/* Selected indicator */}
          {isAnyStaff && (
            <div className="w-6 h-6 rounded-full bg-primary-400 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
        </div>
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-sm text-gray-400">hoặc chọn nhân viên</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto"></div>
          <p className="text-gray-500 mt-4">Đang tải danh sách nhân viên...</p>
        </div>
      ) : availableStaff.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-12 h-12 mx-auto mb-2 opacity-50 text-gray-400" />
          <p className="text-gray-500">Không có nhân viên</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1">
          {availableStaff.map((staffMember) => (
            <button
              key={staffMember.id}
              onClick={() => handleSelectStaff(staffMember.id)}
              className={`
                p-4 rounded-xl border-2 transition-all duration-200 text-center
                ${
                  selectedStaffId === staffMember.id && !isAnyStaff
                    ? "border-primary-400 bg-primary-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-primary-300 hover:shadow-sm"
                }
              `}
            >
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-xl font-semibold bg-primary-400">
                {staffMember.name.charAt(0).toUpperCase()}
              </div>

              {/* Name */}
              <h3 className="font-medium text-gray-900 text-sm truncate">
                {staffMember.name}
              </h3>

              {/* Selected indicator */}
              {selectedStaffId === staffMember.id && !isAnyStaff && (
                <div className="w-5 h-5 rounded-full bg-primary-400 flex items-center justify-center mx-auto mt-2">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
