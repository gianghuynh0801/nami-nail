"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  X,
  CheckCircle2,
  Scissors,
  Users,
  Calendar,
  User,
  FileText,
  ArrowRight,
  ArrowLeft,
  Building2,
} from "lucide-react";
import StepBranch from "./steps/StepBranch";
import StepService from "./steps/StepService";
import Step2Service from "../booking-wizard/steps/Step2Service";
import StepStaff from "./steps/StepStaff";
import StepDateTime from "./steps/StepDateTime";
import StepCustomerInfo from "./steps/StepCustomerInfo";
import StepConfirmation from "./steps/StepConfirmation";
import { salonLocalToUtcISOString } from "@/lib/timezone";

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface Staff {
  id: string;
  name: string;
  phone: string;
}

interface Salon {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  timezone?: string;
}

interface BookingWizardProps {
  salon?: Salon | null;
  services?: Service[];
  staff?: Staff[];
  salons?: Salon[];
  onClose?: () => void;
}

type Step =
  | "branch"
  | "service"
  | "staff"
  | "datetime"
  | "customer"
  | "confirmation";

const steps: { id: Step; label: string; subtitle: string; icon: any }[] = [
  { id: "branch", label: "Branch", subtitle: "Select branch", icon: Building2 },
  {
    id: "service",
    label: "Service",
    subtitle: "Select service",
    icon: Scissors,
  },
  { id: "staff", label: "Staff", subtitle: "Select staff", icon: Users },
  {
    id: "datetime",
    label: "Date & Time",
    subtitle: "Select time",
    icon: Calendar,
  },
  {
    id: "customer",
    label: "Information",
    subtitle: "Customer information",
    icon: User,
  },
  {
    id: "confirmation",
    label: "Confirmation",
    subtitle: "Review & book",
    icon: FileText,
  },
];

export default function BookingWizard({
  salon: initialSalon,
  services: initialServices,
  staff: initialStaff,
  salons,
  onClose,
}: BookingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(
    initialSalon ? "service" : "branch",
  );
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(
    initialSalon?.id || null,
  );
  const [salon, setSalon] = useState<Salon | null>(initialSalon || null);
  const [services, setServices] = useState<Service[]>(initialServices || []);
  const [staff, setStaff] = useState<Staff[]>(initialStaff || []);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [isAnyStaff, setIsAnyStaff] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const getCurrentStepIndex = () => {
    return steps.findIndex((s) => s.id === currentStep);
  };

  const getStepStatus = (stepId: Step) => {
    const stepIndex = steps.findIndex((s) => s.id === stepId);
    const currentIndex = getCurrentStepIndex();

    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "current";
    return "pending";
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case "branch":
        return !!selectedSalonId;
      case "service":
        return selectedServiceIds.length > 0;
      case "staff":
        return !!selectedStaffId || isAnyStaff;
      case "datetime":
        return !!selectedDate && !!selectedTime;
      case "customer":
        return !!customerInfo.name && !!customerInfo.phone;
      default:
        return true;
    }
  };

  const handleSalonSelect = async (salonId: string) => {
    setSelectedSalonId(salonId);

    // Fetch salon details, services, and staff
    try {
      const response = await fetch(
        `/api/booking/salon-data?salonId=${salonId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setSalon(data.salon);
        setServices(data.services || []);
        setStaff(data.staff || []);

        // Auto-advance to next step after selecting salon
        if (currentStep === "branch") {
          setTimeout(() => {
            setCurrentStep("service");
          }, 300);
        }
      }
    } catch (error) {
      console.error("Error fetching salon data:", error);
    }
  };

  const handleNext = () => {
    if (!canProceedToNext()) return;

    const currentIndex = getCurrentStepIndex();
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id as Step);
    }
  };

  const handleBack = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id as Step);
    }
  };

  const handleStepClick = (stepId: Step) => {
    const stepIndex = steps.findIndex((s) => s.id === stepId);
    const currentIndex = getCurrentStepIndex();

    // Only allow clicking on completed steps or next step
    if (stepIndex <= currentIndex) {
      setCurrentStep(stepId);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      if (!salon) {
        throw new Error("Please select a branch first");
      }

      const selectedServices = services.filter((s) =>
        selectedServiceIds.includes(s.id),
      );
      if (selectedServices.length === 0) {
        throw new Error("Vui lòng chọn ít nhất một dịch vụ");
      }

      const startTimeISO = salonLocalToUtcISOString(
        selectedDate,
        selectedTime,
        salon.timezone,
      );

      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId: salon.id,
          customerName: customerInfo.name,
          customerPhone: customerInfo.phone,
          serviceIds: selectedServiceIds,
          staffId: isAnyStaff ? null : selectedStaffId,
          startTime: startTimeISO,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "An error occurred");
      }

      // Redirect to success page
      router.push(`/booking/${salon.slug}/success`);
    } catch (err: any) {
      setError(err.message || "An error occurred while booking");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "branch":
        if (!salons) return null;
        return (
          <StepBranch
            salons={salons}
            selectedSalonId={selectedSalonId}
            onSelect={handleSalonSelect}
          />
        );
      case "service":
        if (!salon) {
          return (
            <div className="text-center py-12">
              <p className="text-gray-500">Please select a branch first</p>
            </div>
          );
        }
        return (
          <Step2Service
            salonId={salon.id}
            selectedServiceIds={selectedServiceIds}
            onToggle={(service) => {
              setSelectedServiceIds((prev) =>
                prev.includes(service.id)
                  ? prev.filter((id) => id !== service.id)
                  : [...prev, service.id],
              );
            }}
            // Navigation is handled by the wizard footer buttons
            onNext={() => {}}
            onBack={() => {}}
            hideNavigation={true}
            // Keep local `services` state in sync for later steps (e.g. confirmation)
            onServicesLoaded={(loadedServices) => {
              setServices(loadedServices);
            }}
          />
        );
      case "staff":
        if (!salon) {
          return (
            <div className="text-center py-12">
              <p className="text-gray-500">Please select a branch first</p>
            </div>
          );
        }
        return (
          <StepStaff
            salonId={salon.id}
            serviceIds={selectedServiceIds}
            staff={staff}
            selectedStaffId={selectedStaffId}
            isAnyStaff={isAnyStaff}
            onSelect={(staffId, isAnyStaffValue) => {
              setSelectedStaffId(staffId);
              setIsAnyStaff(isAnyStaffValue || false);
            }}
          />
        );
      case "datetime":
        if (!salon) {
          return (
            <div className="text-center py-12">
              <p className="text-gray-500">Please select a branch first</p>
            </div>
          );
        }
        return (
          <StepDateTime
            salonId={salon.id}
            serviceIds={selectedServiceIds}
            staffId={selectedStaffId}
            isAnyStaff={isAnyStaff}
            salonTimezone={salon.timezone}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onSelectDate={setSelectedDate}
            onSelectTime={setSelectedTime}
          />
        );
      case "customer":
        return (
          <StepCustomerInfo
            customerInfo={customerInfo}
            onChange={setCustomerInfo}
          />
        );
      case "confirmation":
        if (!salon) {
          return (
            <div className="text-center py-12">
              <p className="text-gray-500">Please select a branch first</p>
            </div>
          );
        }
        // salon is guaranteed to be non-null here due to the check above
        return (
          <StepConfirmation
            salon={salon}
            services={services.filter((s) => selectedServiceIds.includes(s.id))}
            staff={staff.find((s) => s.id === selectedStaffId)}
            date={selectedDate}
            time={selectedTime}
            customerInfo={customerInfo}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4">
      <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] md:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-4">
            <Image
              src="/images/logo.webp"
              alt="NAMI Nail"
              width={40}
              height={40}
              className="object-contain"
            />
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Book Appointment
              </h2>
              <p className="text-sm text-gray-600">
                {salon?.name || "Select a branch"}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Sidebar - Desktop */}
          {!isMobile && (
            <div className="hidden md:block w-64 bg-gray-800 text-white p-6 overflow-y-auto">
              <div className="space-y-4">
                {steps.map((step, index) => {
                  const status = getStepStatus(step.id);
                  const Icon = step.icon;

                  return (
                    <div
                      key={step.id}
                      onClick={() => handleStepClick(step.id)}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                        ${
                          status === "current"
                            ? "bg-primary-400 text-white"
                            : status === "completed"
                              ? "bg-gray-700 text-white hover:bg-gray-600"
                              : "text-gray-400 hover:text-gray-300"
                        }
                      `}
                    >
                      <div
                        className={`
                        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                        ${
                          status === "current"
                            ? "bg-white text-primary-400"
                            : status === "completed"
                              ? "bg-green-500 text-white"
                              : "bg-gray-700 text-gray-400"
                        }
                      `}
                      >
                        {status === "completed" ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-semibold">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{step.label}</p>
                        <p className="text-xs opacity-80 truncate">
                          {step.subtitle}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm mb-4">
                  {error}
                </div>
              )}
              {renderStepContent()}
            </div>

            {/* Bottom Navigation */}
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBack}
                  disabled={getCurrentStepIndex() === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                {/* Mobile Step Indicator */}
                {isMobile && (
                  <div className="flex items-center gap-1.5 flex-1 justify-center">
                    {steps.map((step, index) => {
                      const status = getStepStatus(step.id);
                      return (
                        <div
                          key={step.id}
                          className={`
                            h-1.5 rounded-full transition-all
                            ${
                              status === "current"
                                ? "bg-primary-400 w-8"
                                : status === "completed"
                                  ? "bg-green-500 w-2"
                                  : "bg-gray-300 w-2"
                            }
                          `}
                        />
                      );
                    })}
                  </div>
                )}

                {currentStep !== "confirmation" ? (
                  <button
                    onClick={handleNext}
                    disabled={!canProceedToNext()}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-400 text-white rounded-xl hover:bg-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !canProceedToNext()}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-400 text-white rounded-xl hover:bg-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {loading ? "Processing..." : "Confirm Booking"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
