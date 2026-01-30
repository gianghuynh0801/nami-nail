"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Scissors,
  Clock,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Search,
  Check,
  CheckSquare,
  Square,
} from "lucide-react";
import type { Service, ServiceCategory } from "../types";

interface Step2ServiceProps {
  salonId: string;
  selectedServiceIds: string[];
  onToggle: (service: Service) => void;
  onNext: () => void;
  onBack: () => void;
  /**
   * Optional callback to expose loaded services to parent components.
   * Useful when another wizard (e.g. modal booking) needs the same
   * service data for later steps like confirmation.
   */
  onServicesLoaded?: (services: Service[]) => void;
  /**
   * When true, hides the internal navigation buttons.
   * This lets parent wizards render their own Back/Next controls.
   */
  hideNavigation?: boolean;
}

export default function Step2Service({
  salonId,
  selectedServiceIds = [],
  onToggle,
  onNext,
  onBack,
  onServicesLoaded,
  hideNavigation = false,
}: Step2ServiceProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  ); // null = "Tất cả"

  useEffect(() => {
    if (salonId) {
      fetchServicesAndCategories();
    }
  }, [salonId]);

  const fetchServicesAndCategories = async () => {
    try {
      const res = await fetch(`/api/booking/services?salonId=${salonId}`);
      if (res.ok) {
        const data = await res.json();
        const loadedServices: Service[] = data.services || [];
        setServices(loadedServices);
        setCategories(data.categories || []);

        if (onServicesLoaded) {
          onServicesLoaded(loadedServices);
        }
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter services based on selected category and search term
  const filteredServices = useMemo(() => {
    let filtered = services;

    // Filter by category
    if (selectedCategoryId !== null) {
      const category = categories.find((c) => c.id === selectedCategoryId);
      if (category) {
        filtered = filtered.filter((service) =>
          category.serviceIds.includes(service.id),
        );
      }
    }
    // If "Tất cả" (null), show all services including those without categories

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((service) =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    return filtered;
  }, [services, categories, selectedCategoryId, searchTerm]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
  };

  const handleToggle = (service: Service) => {
    onToggle(service);
  };

  const handleContinue = () => {
    if (selectedServiceIds.length > 0) {
      onNext();
    }
  };

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-400 mx-auto" />
          <p className="mt-4 text-gray-500">Đang tải danh sách dịch vụ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Chọn Dịch vụ</h2>
        <p className="text-gray-500">
          Chọn một hoặc nhiều dịch vụ bạn muốn sử dụng
        </p>
      </div>

      {/* Category Selection - Only show if categories exist */}
      {categories.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">
            Chọn danh mục
          </p>
          <div className="flex flex-wrap gap-2">
            {/* "Tất cả" button */}
            <button
              onClick={() => handleCategorySelect(null)}
              className={`
                px-4 py-2.5 rounded-xl border-2 transition-all duration-200 flex items-center gap-2
                ${
                  selectedCategoryId === null
                    ? "border-primary-400 bg-primary-50 text-primary-700 font-medium shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-gray-50"
                }
              `}
            >
              {selectedCategoryId === null && <Check className="w-4 h-4" />}
              <span>Tất cả</span>
            </button>

            {/* Category buttons */}
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={`
                  px-4 py-2.5 rounded-xl border-2 transition-all duration-200 flex items-center gap-2
                  ${
                    selectedCategoryId === category.id
                      ? "border-primary-400 bg-primary-50 text-primary-700 font-medium shadow-sm"
                      : "border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-gray-50"
                  }
                `}
              >
                {selectedCategoryId === category.id && (
                  <Check className="w-4 h-4" />
                )}
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      {services.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm dịch vụ..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          />
        </div>
      )}

      {/* Service List */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">
          {selectedCategoryId === null
            ? "Chọn dịch vụ"
            : `Dịch vụ ${categories.find((c) => c.id === selectedCategoryId)?.name || ""}`}
        </p>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {filteredServices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Scissors className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Không tìm thấy dịch vụ</p>
              {selectedCategoryId !== null && (
                <button
                  onClick={() => handleCategorySelect(null)}
                  className="mt-2 text-primary-600 hover:underline text-sm"
                >
                  Xem tất cả dịch vụ
                </button>
              )}
            </div>
          ) : (
            filteredServices.map((service) => {
              const isSelected = selectedServiceIds.includes(service.id);
              return (
                <button
                  key={service.id}
                  onClick={() => handleToggle(service)}
                  className={`
                    w-full text-left p-4 rounded-xl border-2 transition-all duration-200
                    ${
                      isSelected
                        ? "border-primary-400 bg-primary-50 shadow-md"
                        : "border-gray-200 bg-white hover:border-primary-300 hover:shadow-sm"
                    }
                  `}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox Icon */}
                    <div
                      className={`
                      flex-shrink-0 mt-1
                      ${isSelected ? "text-primary-500" : "text-gray-300"}
                    `}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-6 h-6" />
                      ) : (
                        <Square className="w-6 h-6" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {service.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-gray-500">
                          <Clock className="w-4 h-4" />
                          {service.duration} phút
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-primary-600">
                          <DollarSign className="w-4 h-4" />
                          {formatPrice(service.price)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Navigation (optional, can be hidden when embedded in another wizard) */}
      {!hideNavigation && (
        <div className="pt-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Quay lại
          </button>
          <button
            onClick={handleContinue}
            disabled={selectedServiceIds.length === 0}
            className={`
              flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
              ${
                selectedServiceIds.length > 0
                  ? "bg-primary-400 text-white hover:bg-primary-500 shadow-lg shadow-primary-400/30"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }
            `}
          >
            Tiếp tục ({selectedServiceIds.length})
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
