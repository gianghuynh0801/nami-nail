"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  Building2,
  BarChart3,
  Clock,
  CalendarDays,
  CalendarClock,
} from "lucide-react";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  submenu?: MenuItem[];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ isOpen, onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();

  const menuItems: MenuItem[] = [
    {
      id: "dashboard",
      label: "Bảng điều khiển",
      icon: <LayoutDashboard className="w-5 h-5" />,
      href: "/dashboard",
    },
    {
      id: "appointments",
      label: "Lịch hẹn",
      icon: <Calendar className="w-5 h-5" />,
      href: "/dashboard/appointments",
    },
    {
      id: "calendar",
      label: "Lịch nhân viên",
      icon: <CalendarClock className="w-5 h-5" />,
      href: "/dashboard/calendar",
    },
    {
      id: "customers",
      label: "Khách hàng",
      icon: <Users className="w-5 h-5" />,
      href: "/dashboard/customers",
    },
    {
      id: "invoices",
      label: "Hóa đơn",
      icon: <FileText className="w-5 h-5" />,
      href: "/dashboard/invoices",
    },
    {
      id: "branches",
      label: "Chi nhánh",
      icon: <Building2 className="w-5 h-5" />,
      href: "/dashboard/branches",
    },
    {
      id: "statistics",
      label: "Thống kê",
      icon: <BarChart3 className="w-5 h-5" />,
      href: "/dashboard/statistics",
    },
    {
      id: "working-hours",
      label: "Giờ làm việc",
      icon: <Clock className="w-5 h-5" />,
      href: "/dashboard/working-hours",
    },
    {
      id: "work-schedule",
      label: "Lịch làm việc",
      icon: <CalendarDays className="w-5 h-5" />,
      href: "/dashboard/work-schedule",
    },
    {
      id: "shift-management",
      label: "Chia ca Realtime",
      icon: <Users className="w-5 h-5" />,
      href: "/dashboard/shift-management",
    },
  ];

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname?.startsWith(href + "/");
  };

  // Close sidebar when clicking on a link on mobile
  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen bg-white border-r border-beige-dark/30 overflow-y-auto z-50 transition-all duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${
          isCollapsed ? "lg:w-16" : "lg:w-64"
        } w-64`}
      >
        {/* Logo */}
        <div className={`border-b border-beige-dark/30 bg-beige-light/50 ${
          isCollapsed ? "p-4" : "p-6"
        }`}>
          <div className={`flex items-center ${
            isCollapsed ? "justify-center flex-col gap-2" : "justify-between"
          }`}>
            <Link 
              href="/dashboard" 
              className={`block ${isCollapsed ? "w-full flex justify-center" : ""}`} 
              onClick={handleLinkClick}
            >
              {!isCollapsed ? (
                <Image
                  src="/images/logo.webp"
                  alt="NAMI Nail"
                  width={120}
                  height={40}
                  className="h-10 w-auto object-contain"
                  priority
                />
              ) : (
                <Image
                  src="/images/logo.webp"
                  alt="NAMI Nail"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain rounded"
                  priority
                />
              )}
            </Link>
            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            {/* Collapse toggle button for desktop */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className={`hidden lg:flex p-1.5 hover:bg-gray-100 rounded-lg transition-colors ${
                  isCollapsed ? "w-full justify-center mt-2" : ""
                }`}
                aria-label={isCollapsed ? "Mở rộng sidebar" : "Thu nhỏ sidebar"}
                title={isCollapsed ? "Mở rộng sidebar" : "Thu nhỏ sidebar"}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <nav className={`space-y-1 ${isCollapsed ? "p-2" : "p-4"}`}>
          {menuItems.map((item) => (
            <div key={item.id}>
              {item.href && (
                <Link
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`flex items-center rounded-lg transition-all ${
                    isCollapsed 
                      ? "justify-center px-2 py-3" 
                      : "gap-3 px-4 py-3"
                  } ${
                    isActive(item.href)
                      ? "bg-primary-400 text-white shadow-md shadow-primary-400/20"
                      : "text-gray-600 hover:bg-beige-light hover:text-primary-500"
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span
                    className={
                      isActive(item.href) ? "text-white" : "text-primary-400"
                    }
                  >
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="flex-1 font-medium">{item.label}</span>
                  )}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}
