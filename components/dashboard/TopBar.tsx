"use client";

import { useSession, signOut } from "next-auth/react";
import {
  Bell,
  User,
  LogOut,
  Menu,
  Plus,
  ChevronDown,
  Building2,
  Languages,
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { useState, useEffect } from "react";
import { DEFAULT_SALON_TIMEZONE } from "@/lib/timezone";
import { BookingWizardModal } from "@/components/booking-wizard";
import { useSalonContext } from "@/contexts/SalonContext";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { data: session } = useSession();
  const {
    salons,
    selectedSalonId,
    selectedSalon,
    setSelectedSalonId,
    loading: salonsLoading,
  } = useSalonContext();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [showBookingWizard, setShowBookingWizard] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showSalonDropdown, setShowSalonDropdown] = useState(false);
  const [showLocaleDropdown, setShowLocaleDropdown] = useState(false);
  const locale = useLocale();
  const pathname = usePathname();
  const tTopBar = useTranslations("TopBar");

  useEffect(() => {
    setIsMounted(true);
    setCurrentTime(new Date());

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Luôn dùng múi giờ Áo (Europe/Vienna) cho giờ hiển thị
  const tz = DEFAULT_SALON_TIMEZONE;
  const time = currentTime ? formatInTimeZone(currentTime, tz, "HH:mm") : "--:--";
  const date = currentTime
    ? formatInTimeZone(currentTime, tz, "MMM dd, yyyy")
    : "-- --, ----";

  return (
    <>
      <div className="h-16 bg-white border-b border-beige-dark/30 fixed top-0 left-0 lg:left-64 right-0 z-40 flex items-center justify-between px-4 lg:px-6">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6 text-gray-600" />
        </button>

        {/* Left: Brand + Chi nhánh gộp thành 1 dropdown */}
        <div className="flex-1 lg:flex-initial min-w-0">
          {salons.length > 0 ? (
            <div className="relative inline-block">
              <button
                onClick={() => setShowSalonDropdown(!showSalonDropdown)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/80 hover:bg-gray-100 transition-colors text-left min-w-0 max-w-full sm:max-w-[280px]"
              >
                <span className="text-base lg:text-lg font-playfair font-semibold text-primary-600 flex-shrink-0">
                  NAMI
                </span>
                <span className="hidden sm:inline text-gray-400 flex-shrink-0">
                  ·
                </span>
                <span className="truncate text-sm font-medium text-gray-700 flex-1 min-w-0">
                  {selectedSalon?.name || tTopBar("selectBranch")}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${showSalonDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {showSalonDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowSalonDropdown(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <div className="px-3 py-2 text-xs text-gray-500 font-medium uppercase tracking-wide border-b">
                      {tTopBar("branch")}
                    </div>
                    {salons.map((salon) => (
                      <button
                        key={salon.id}
                        onClick={() => {
                          setSelectedSalonId(salon.id);
                          setShowSalonDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors flex items-center gap-2 ${
                          salon.id === selectedSalonId
                            ? "bg-primary-50 text-primary-700"
                            : "text-gray-700"
                        }`}
                      >
                        <Building2
                          className={`w-4 h-4 flex-shrink-0 ${salon.id === selectedSalonId ? "text-primary-500" : "text-gray-400"}`}
                        />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{salon.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {salon.address}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-base lg:text-lg font-playfair font-semibold text-primary-600">
              NAMI Nail Management
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Add Appointment Button */}
          <button
            onClick={() => setShowBookingWizard(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{tTopBar("bookAppointment")}</span>
          </button>

          {/* Time - hidden on small mobile */}
          <div
            className="hidden md:block text-gray-700 font-medium text-sm"
            suppressHydrationWarning
          >
            {time}
          </div>

          {/* Date - hidden on mobile */}
          <div
            className="hidden lg:block text-gray-500 text-sm"
            suppressHydrationWarning
          >
            {date}
          </div>

          {/* Locale switcher */}
          <div className="relative">
            <button
              onClick={() => setShowLocaleDropdown(!showLocaleDropdown)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
              title="Language"
            >
              <Languages className="w-4 h-4" />
              <span className="uppercase">{locale}</span>
            </button>
            {showLocaleDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowLocaleDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-28 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <Link
                    href={pathname}
                    locale="en"
                    onClick={() => setShowLocaleDropdown(false)}
                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-primary-50 ${
                      locale === "en" ? "bg-primary-50 text-primary-700 font-medium" : "text-gray-700"
                    }`}
                  >
                    English
                  </Link>
                  <Link
                    href={pathname}
                    locale="vi"
                    onClick={() => setShowLocaleDropdown(false)}
                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-primary-50 ${
                      locale === "vi" ? "bg-primary-50 text-primary-700 font-medium" : "text-gray-700"
                    }`}
                  >
                    Tiếng Việt
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Bell Icon */}
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
          </button>

          {/* User */}
          <div className="flex items-center gap-2 lg:gap-3">
            <span className="hidden md:block text-gray-700 font-medium text-sm">
              {session?.user?.name || "User"}
            </span>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-500 flex items-center justify-center">
              <User className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
            </div>
            <button
              onClick={() => signOut({ callbackUrl: `/${locale}` })}
              className="p-2 hover:bg-beige-light rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4 lg:w-5 lg:h-5 text-primary-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Booking Wizard Modal */}
      <BookingWizardModal
        isOpen={showBookingWizard}
        onClose={() => setShowBookingWizard(false)}
        initialSalonId={selectedSalonId || undefined}
        onSuccess={(appointmentId) => {
          console.log("Booking created from TopBar:", appointmentId);
        }}
      />
    </>
  );
}
