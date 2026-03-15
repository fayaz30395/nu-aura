'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { TravelType, TransportMode, TravelRequestRequest } from '@/lib/types/travel';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCreateTravelRequest, useSubmitTravelRequest } from '@/lib/hooks/queries/useTravel';
import {
  Plane,
  ArrowLeft,
  MapPin,
  Calendar,
  DollarSign,
  Briefcase,
  Hotel,
  Car,
  AlertCircle,
  Loader2,
  Save,
  Send,
  Train,
  Bus,
} from 'lucide-react';

export default function NewTravelRequestPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Mutations
  const createMutation = useCreateTravelRequest();
  const submitMutation = useSubmitTravelRequest();

  // Form state
  const [formData, setFormData] = useState<Partial<TravelRequestRequest>>({
    travelType: 'BUSINESS',
    transportMode: 'FLIGHT',
    accommodationRequired: false,
    cabRequired: false,
    isInternational: false,
    visaRequired: false,
    advanceRequired: 0,
    estimatedCost: 0,
  });

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.employeeId) {
      setFormData((prev) => ({ ...prev, employeeId: user.employeeId }));
    }
  }, [isAuthenticated, hasHydrated, router, user]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.travelType) errors.travelType = 'Travel type is required';
    if (!formData.purpose || formData.purpose.trim() === '') errors.purpose = 'Purpose is required';
    if (!formData.originCity || formData.originCity.trim() === '')
      errors.originCity = 'Origin city is required';
    if (!formData.destinationCity || formData.destinationCity.trim() === '')
      errors.destinationCity = 'Destination city is required';
    if (!formData.departureDate) errors.departureDate = 'Departure date is required';
    if (!formData.returnDate) errors.returnDate = 'Return date is required';

    if (formData.departureDate && formData.returnDate) {
      if (new Date(formData.returnDate) < new Date(formData.departureDate)) {
        errors.returnDate = 'Return date must be after departure date';
      }
    }

    if (!formData.transportMode) errors.transportMode = 'Transport mode is required';
    if (!formData.estimatedCost || formData.estimatedCost <= 0)
      errors.estimatedCost = 'Estimated cost must be greater than 0';

    if (formData.accommodationRequired) {
      if (!formData.checkInDate) errors.checkInDate = 'Check-in date is required';
      if (!formData.checkOutDate) errors.checkOutDate = 'Check-out date is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (isDraft: boolean = false) => {
    if (!isDraft && !validateForm()) {
      setError('Please fix the validation errors before submitting');
      return;
    }

    if (!user?.employeeId) {
      setError('Employee ID not found');
      return;
    }

    const requestData: TravelRequestRequest = {
      employeeId: user.employeeId,
      travelType: formData.travelType || 'BUSINESS',
      purpose: formData.purpose || '',
      projectId: formData.projectId,
      clientName: formData.clientName,
      originCity: formData.originCity || '',
      destinationCity: formData.destinationCity || '',
      departureDate: formData.departureDate || '',
      returnDate: formData.returnDate || '',
      departureTime: formData.departureTime,
      returnTime: formData.returnTime,
      accommodationRequired: formData.accommodationRequired || false,
      hotelPreference: formData.hotelPreference,
      checkInDate: formData.checkInDate,
      checkOutDate: formData.checkOutDate,
      transportMode: formData.transportMode || 'FLIGHT',
      transportClass: formData.transportClass,
      cabRequired: formData.cabRequired || false,
      estimatedCost: formData.estimatedCost || 0,
      advanceRequired: formData.advanceRequired || 0,
      specialInstructions: formData.specialInstructions,
      isInternational: formData.isInternational || false,
      visaRequired: formData.visaRequired || false,
    };

    createMutation.mutate(requestData, {
      onSuccess: (response) => {
        if (!isDraft && response.id) {
          submitMutation.mutate(response.id, {
            onSuccess: () => {
              router.push(`/travel/${response.id}`);
            },
            onError: () => {
              setError('Travel request created but failed to submit');
            },
          });
        } else {
          router.push(`/travel/${response.id}`);
        }
      },
      onError: (error: unknown) => {
        console.error('Error creating travel request:', error);
        setError((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create travel request');
      },
    });
  };

  const handleInputChange = (field: keyof TravelRequestRequest, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!hasHydrated || !isAuthenticated) {
    return (
      <AppLayout activeMenuItem="travel">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="travel">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-surface-600 dark:text-surface-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              New Travel Request
            </h1>
            <p className="text-surface-500 dark:text-surface-400 mt-1">
              Submit a new travel request for approval
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
          {/* Travel Type & Purpose */}
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-surface-200 dark:border-surface-800">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <Briefcase className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                Travel Details
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Travel Type */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Travel Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.travelType}
                  onChange={(e) => handleInputChange('travelType', e.target.value as TravelType)}
                  className={`w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border ${
                    validationErrors.travelType
                      ? 'border-red-500'
                      : 'border-surface-200 dark:border-surface-700'
                  } rounded-xl text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all`}
                >
                  <option value="BUSINESS">Business</option>
                  <option value="TRAINING">Training</option>
                  <option value="CLIENT_VISIT">Client Visit</option>
                  <option value="CONFERENCE">Conference</option>
                  <option value="RELOCATION">Relocation</option>
                  <option value="OTHER">Other</option>
                </select>
                {validationErrors.travelType && (
                  <p className="mt-1 text-sm text-red-500">{validationErrors.travelType}</p>
                )}
              </div>

              {/* Client Name */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Client Name
                </label>
                <input
                  type="text"
                  value={formData.clientName || ''}
                  onChange={(e) => handleInputChange('clientName', e.target.value)}
                  placeholder="Enter client name"
                  className="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Purpose <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.purpose || ''}
                onChange={(e) => handleInputChange('purpose', e.target.value)}
                placeholder="Describe the purpose of your travel"
                rows={3}
                className={`w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border ${
                  validationErrors.purpose
                    ? 'border-red-500'
                    : 'border-surface-200 dark:border-surface-700'
                } rounded-xl text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none`}
              />
              {validationErrors.purpose && (
                <p className="mt-1 text-sm text-red-500">{validationErrors.purpose}</p>
              )}
            </div>
          </div>

          {/* Journey Details */}
          <div className="p-6 bg-surface-50 dark:bg-surface-800/50 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-surface-200 dark:border-surface-700">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                Journey Details
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Origin City */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Origin City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.originCity || ''}
                  onChange={(e) => handleInputChange('originCity', e.target.value)}
                  placeholder="e.g., Mumbai"
                  className={`w-full px-4 py-2.5 bg-[var(--bg-card)] border ${
                    validationErrors.originCity
                      ? 'border-red-500'
                      : 'border-surface-200 dark:border-surface-700'
                  } rounded-xl text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all`}
                />
                {validationErrors.originCity && (
                  <p className="mt-1 text-sm text-red-500">{validationErrors.originCity}</p>
                )}
              </div>

              {/* Destination City */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Destination City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.destinationCity || ''}
                  onChange={(e) => handleInputChange('destinationCity', e.target.value)}
                  placeholder="e.g., Delhi"
                  className={`w-full px-4 py-2.5 bg-[var(--bg-card)] border ${
                    validationErrors.destinationCity
                      ? 'border-red-500'
                      : 'border-surface-200 dark:border-surface-700'
                  } rounded-xl text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all`}
                />
                {validationErrors.destinationCity && (
                  <p className="mt-1 text-sm text-red-500">{validationErrors.destinationCity}</p>
                )}
              </div>

              {/* Departure Date */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Departure Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.departureDate || ''}
                  onChange={(e) => handleInputChange('departureDate', e.target.value)}
                  className={`w-full px-4 py-2.5 bg-[var(--bg-card)] border ${
                    validationErrors.departureDate
                      ? 'border-red-500'
                      : 'border-surface-200 dark:border-surface-700'
                  } rounded-xl text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all`}
                />
                {validationErrors.departureDate && (
                  <p className="mt-1 text-sm text-red-500">{validationErrors.departureDate}</p>
                )}
              </div>

              {/* Return Date */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Return Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.returnDate || ''}
                  onChange={(e) => handleInputChange('returnDate', e.target.value)}
                  min={formData.departureDate}
                  className={`w-full px-4 py-2.5 bg-[var(--bg-card)] border ${
                    validationErrors.returnDate
                      ? 'border-red-500'
                      : 'border-surface-200 dark:border-surface-700'
                  } rounded-xl text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all`}
                />
                {validationErrors.returnDate && (
                  <p className="mt-1 text-sm text-red-500">{validationErrors.returnDate}</p>
                )}
              </div>
            </div>

            {/* International Travel */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isInternational || false}
                  onChange={(e) => handleInputChange('isInternational', e.target.checked)}
                  className="w-4 h-4 text-primary-600 bg-[var(--bg-card)] border-surface-300 dark:border-surface-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-surface-700 dark:text-surface-300">
                  International Travel
                </span>
              </label>

              {formData.isInternational && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.visaRequired || false}
                    onChange={(e) => handleInputChange('visaRequired', e.target.checked)}
                    className="w-4 h-4 text-primary-600 bg-[var(--bg-card)] border-surface-300 dark:border-surface-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-surface-700 dark:text-surface-300">
                    Visa Required
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Transport Details */}
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-surface-200 dark:border-surface-800">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                <Plane className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                Transport Details
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Transport Mode */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Transport Mode <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.transportMode}
                  onChange={(e) =>
                    handleInputChange('transportMode', e.target.value as TransportMode)
                  }
                  className={`w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border ${
                    validationErrors.transportMode
                      ? 'border-red-500'
                      : 'border-surface-200 dark:border-surface-700'
                  } rounded-xl text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all`}
                >
                  <option value="FLIGHT">Flight</option>
                  <option value="TRAIN">Train</option>
                  <option value="BUS">Bus</option>
                  <option value="CAR">Car</option>
                  <option value="SELF_ARRANGED">Self Arranged</option>
                </select>
                {validationErrors.transportMode && (
                  <p className="mt-1 text-sm text-red-500">{validationErrors.transportMode}</p>
                )}
              </div>

              {/* Transport Class */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Class/Type
                </label>
                <input
                  type="text"
                  value={formData.transportClass || ''}
                  onChange={(e) => handleInputChange('transportClass', e.target.value)}
                  placeholder="e.g., Economy, Business"
                  className="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Cab Required */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.cabRequired || false}
                onChange={(e) => handleInputChange('cabRequired', e.target.checked)}
                className="w-4 h-4 text-primary-600 bg-surface-50 dark:bg-surface-800 border-surface-300 dark:border-surface-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-surface-700 dark:text-surface-300">
                Local cab/taxi required
              </span>
            </label>
          </div>

          {/* Accommodation */}
          <div className="p-6 bg-surface-50 dark:bg-surface-800/50 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-surface-200 dark:border-surface-700">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Hotel className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                Accommodation
              </h2>
            </div>

            {/* Accommodation Required */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.accommodationRequired || false}
                onChange={(e) => handleInputChange('accommodationRequired', e.target.checked)}
                className="w-4 h-4 text-primary-600 bg-[var(--bg-card)] border-surface-300 dark:border-surface-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-surface-700 dark:text-surface-300">
                Accommodation required
              </span>
            </label>

            {formData.accommodationRequired && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Hotel Preference */}
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Hotel Preference
                  </label>
                  <input
                    type="text"
                    value={formData.hotelPreference || ''}
                    onChange={(e) => handleInputChange('hotelPreference', e.target.value)}
                    placeholder="Enter preferred hotel or area"
                    className="w-full px-4 py-2.5 bg-[var(--bg-card)] border border-surface-200 dark:border-surface-700 rounded-xl text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Check-in Date */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Check-in Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.checkInDate || ''}
                    onChange={(e) => handleInputChange('checkInDate', e.target.value)}
                    min={formData.departureDate}
                    className={`w-full px-4 py-2.5 bg-[var(--bg-card)] border ${
                      validationErrors.checkInDate
                        ? 'border-red-500'
                        : 'border-surface-200 dark:border-surface-700'
                    } rounded-xl text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all`}
                  />
                  {validationErrors.checkInDate && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.checkInDate}</p>
                  )}
                </div>

                {/* Check-out Date */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Check-out Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.checkOutDate || ''}
                    onChange={(e) => handleInputChange('checkOutDate', e.target.value)}
                    min={formData.checkInDate || formData.departureDate}
                    max={formData.returnDate}
                    className={`w-full px-4 py-2.5 bg-[var(--bg-card)] border ${
                      validationErrors.checkOutDate
                        ? 'border-red-500'
                        : 'border-surface-200 dark:border-surface-700'
                    } rounded-xl text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all`}
                  />
                  {validationErrors.checkOutDate && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.checkOutDate}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Budget */}
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-surface-200 dark:border-surface-800">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                Budget Details
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Estimated Cost */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Estimated Cost (INR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.estimatedCost || ''}
                  onChange={(e) => handleInputChange('estimatedCost', parseFloat(e.target.value))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className={`w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border ${
                    validationErrors.estimatedCost
                      ? 'border-red-500'
                      : 'border-surface-200 dark:border-surface-700'
                  } rounded-xl text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all`}
                />
                {validationErrors.estimatedCost && (
                  <p className="mt-1 text-sm text-red-500">{validationErrors.estimatedCost}</p>
                )}
              </div>

              {/* Advance Required */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Advance Required (INR)
                </label>
                <input
                  type="number"
                  value={formData.advanceRequired || ''}
                  onChange={(e) => handleInputChange('advanceRequired', parseFloat(e.target.value))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Special Instructions */}
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Special Instructions
              </label>
              <textarea
                value={formData.specialInstructions || ''}
                onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                placeholder="Any special requirements or instructions"
                rows={3}
                className="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 pb-6">
          <button
            onClick={() => router.back()}
            disabled={createMutation.isPending || submitMutation.isPending}
            className="px-6 py-2.5 bg-[var(--bg-card)] border border-surface-200 dark:border-surface-800 text-surface-700 dark:text-surface-300 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={createMutation.isPending || submitMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-xl hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending || submitMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Save as Draft
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={createMutation.isPending || submitMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending || submitMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            Submit Request
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
