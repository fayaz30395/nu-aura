'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {AppLayout} from '@/components/layout/AppLayout';
import {TransportMode, TravelType} from '@/lib/types/hrms/travel';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useCreateTravelRequest, useSubmitTravelRequest} from '@/lib/hooks/queries/useTravel';
import {isAxiosError} from '@/lib/utils/type-guards';
import {AlertCircle, ArrowLeft, Briefcase, DollarSign, Hotel, Loader2, MapPin, Plane, Save, Send,} from 'lucide-react';

// ─── Zod Schema ────────────────────────────────────────────────────────────────

const travelRequestSchema = z
  .object({
    travelType: z.enum(['BUSINESS', 'TRAINING', 'CLIENT_VISIT', 'CONFERENCE', 'RELOCATION', 'OTHER']),
    purpose: z.string().min(1, 'Purpose is required'),
    clientName: z.string().optional(),
    projectId: z.string().optional(),
    originCity: z.string().min(1, 'Origin city is required'),
    destinationCity: z.string().min(1, 'Destination city is required'),
    departureDate: z.string().min(1, 'Departure date is required'),
    returnDate: z.string().min(1, 'Return date is required'),
    departureTime: z.string().optional(),
    returnTime: z.string().optional(),
    isInternational: z.boolean().default(false),
    visaRequired: z.boolean().default(false),
    transportMode: z.enum(['FLIGHT', 'TRAIN', 'BUS', 'CAR', 'SELF_ARRANGED']),
    transportClass: z.string().optional(),
    cabRequired: z.boolean().default(false),
    accommodationRequired: z.boolean().default(false),
    hotelPreference: z.string().optional(),
    checkInDate: z.string().optional(),
    checkOutDate: z.string().optional(),
    estimatedCost: z
      .number({coerce: true, invalid_type_error: 'Please enter a valid cost'})
      .positive('Estimated cost must be greater than 0'),
    advanceRequired: z.number({coerce: true}).min(0).optional(),
    specialInstructions: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.departureDate && data.returnDate) {
      if (new Date(data.returnDate) < new Date(data.departureDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Return date must be after departure date',
          path: ['returnDate'],
        });
      }
    }
    if (data.accommodationRequired) {
      if (!data.checkInDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Check-in date is required',
          path: ['checkInDate'],
        });
      }
      if (!data.checkOutDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Check-out date is required',
          path: ['checkOutDate'],
        });
      }
    }
  });

type TravelFormData = z.infer<typeof travelRequestSchema>;

// ─── Component ─────────────────────────────────────────────────────────────────

export default function NewTravelRequestPage() {
  const router = useRouter();
  const {user, isAuthenticated, hasHydrated} = useAuth();
  const {hasAnyPermission, isReady} = usePermissions();
  const createMutation = useCreateTravelRequest();
  const submitMutation = useSubmitTravelRequest();

  const {
    register,
    handleSubmit,
    watch,
    formState: {errors, isSubmitting},
  } = useForm<TravelFormData>({
    resolver: zodResolver(travelRequestSchema),
    defaultValues: {
      travelType: 'BUSINESS',
      transportMode: 'FLIGHT',
      accommodationRequired: false,
      cabRequired: false,
      isInternational: false,
      visaRequired: false,
      advanceRequired: 0,
      estimatedCost: 0,
    },
  });

  const hasAccess = hasAnyPermission(
    Permissions.TRAVEL_CREATE,
    Permissions.TRAVEL_VIEW,
    Permissions.TRAVEL_MANAGE,
  );

  useEffect(() => {
    if (!hasHydrated || !isReady) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [isAuthenticated, hasHydrated, isReady, hasAccess, router]);

  const watchedAccommodation = watch('accommodationRequired');
  const watchedIsInternational = watch('isInternational');
  const watchedDepartureDate = watch('departureDate');

  if (!hasHydrated || !isAuthenticated || !isReady || !hasAccess) {
    return (
      <AppLayout activeMenuItem="travel">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className='h-8 w-8 animate-spin text-accent'/>
        </div>
      </AppLayout>
    );
  }

  const handleSave = handleSubmit(async (data: TravelFormData) => {
    if (!user?.employeeId) return;
    createMutation.mutate(
      {
        employeeId: user.employeeId,
        travelType: data.travelType as TravelType,
        purpose: data.purpose,
        projectId: data.projectId || undefined,
        clientName: data.clientName || undefined,
        originCity: data.originCity,
        destinationCity: data.destinationCity,
        departureDate: data.departureDate,
        returnDate: data.returnDate,
        departureTime: data.departureTime || undefined,
        returnTime: data.returnTime || undefined,
        accommodationRequired: data.accommodationRequired,
        hotelPreference: data.hotelPreference || undefined,
        checkInDate: data.checkInDate || undefined,
        checkOutDate: data.checkOutDate || undefined,
        transportMode: data.transportMode as TransportMode,
        transportClass: data.transportClass || undefined,
        cabRequired: data.cabRequired,
        estimatedCost: data.estimatedCost as number,
        advanceRequired: data.advanceRequired ?? 0,
        specialInstructions: data.specialInstructions || undefined,
        isInternational: data.isInternational,
        visaRequired: data.visaRequired,
      },
      {
        onSuccess: (response) => router.push(`/travel/${response.id}`),
        onError: (error: unknown) => {
          const message = isAxiosError(error)
            ? (error.response?.data as { message?: string })?.message ?? 'Failed to create travel request'
            : 'Failed to create travel request';
          // Error is surfaced via createMutation.isError
          void message;
        },
      }
    );
  });

  const handleSubmitRequest = handleSubmit(async (data: TravelFormData) => {
    if (!user?.employeeId) return;
    createMutation.mutate(
      {
        employeeId: user.employeeId,
        travelType: data.travelType as TravelType,
        purpose: data.purpose,
        projectId: data.projectId || undefined,
        clientName: data.clientName || undefined,
        originCity: data.originCity,
        destinationCity: data.destinationCity,
        departureDate: data.departureDate,
        returnDate: data.returnDate,
        departureTime: data.departureTime || undefined,
        returnTime: data.returnTime || undefined,
        accommodationRequired: data.accommodationRequired,
        hotelPreference: data.hotelPreference || undefined,
        checkInDate: data.checkInDate || undefined,
        checkOutDate: data.checkOutDate || undefined,
        transportMode: data.transportMode as TransportMode,
        transportClass: data.transportClass || undefined,
        cabRequired: data.cabRequired,
        estimatedCost: data.estimatedCost as number,
        advanceRequired: data.advanceRequired ?? 0,
        specialInstructions: data.specialInstructions || undefined,
        isInternational: data.isInternational,
        visaRequired: data.visaRequired,
      },
      {
        onSuccess: (response) => {
          if (response.id) {
            submitMutation.mutate(response.id, {
              onSuccess: () => router.push(`/travel/${response.id}`),
            });
          }
        },
      }
    );
  });

  const isLoading = isSubmitting || createMutation.isPending || submitMutation.isPending;

  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-2.5 bg-[var(--bg-secondary)] border ${
      hasError ? "border-status-danger-border" : 'border-[var(--border-main)]'
    } rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all`;

  const cardInputClass = (hasError: boolean) =>
    `w-full px-4 py-2.5 bg-[var(--bg-card)] border ${
      hasError ? "border-status-danger-border" : 'border-[var(--border-main)]'
    } rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all`;

  return (
    <AppLayout activeMenuItem="travel">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]"/>
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">New Travel Request</h1>
            <p className="text-[var(--text-muted)] mt-1">Submit a new travel request for approval</p>
          </div>
        </div>

        {(createMutation.isError || submitMutation.isError) && (
          <div
            className='flex items-center gap-4 p-4 bg-status-danger-bg border border-status-danger-border rounded-xl'>
            <AlertCircle className='h-5 w-5 text-status-danger-text flex-shrink-0'/>
            <p className='text-sm text-status-danger-text'>Failed to create travel request. Please try
              again.</p>
          </div>
        )}

        <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] overflow-hidden">
          {/* Travel Details */}
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-main)]">
              <div className='p-2 bg-accent-subtle rounded-lg'>
                <Briefcase className='h-5 w-5 text-accent'/>
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Travel Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Travel Type <span className='text-status-danger-text'>*</span>
                </label>
                <select
                  {...register('travelType')}
                  className={inputClass(!!errors.travelType)}
                >
                  <option value="BUSINESS">Business</option>
                  <option value="TRAINING">Training</option>
                  <option value="CLIENT_VISIT">Client Visit</option>
                  <option value="CONFERENCE">Conference</option>
                  <option value="RELOCATION">Relocation</option>
                  <option value="OTHER">Other</option>
                </select>
                {errors.travelType && (
                  <p className='mt-1 text-sm text-status-danger-text'>{errors.travelType.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Client Name
                </label>
                <input
                  type="text"
                  {...register('clientName')}
                  placeholder="Enter client name"
                  className={inputClass(false)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Purpose <span className='text-status-danger-text'>*</span>
              </label>
              <textarea
                {...register('purpose')}
                placeholder="Describe the purpose of your travel"
                rows={3}
                className={`${inputClass(!!errors.purpose)} resize-none`}
              />
              {errors.purpose && (
                <p className='mt-1 text-sm text-status-danger-text'>{errors.purpose.message}</p>
              )}
            </div>
          </div>

          {/* Journey Details */}
          <div className="p-6 bg-[var(--bg-secondary)]/50 space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-main)]">
              <div className='p-2 bg-status-success-bg rounded-lg'>
                <MapPin className='h-5 w-5 text-status-success-text'/>
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Journey Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Origin City <span className='text-status-danger-text'>*</span>
                </label>
                <input
                  type="text"
                  {...register('originCity')}
                  placeholder="e.g., Mumbai"
                  className={cardInputClass(!!errors.originCity)}
                />
                {errors.originCity && (
                  <p className='mt-1 text-sm text-status-danger-text'>{errors.originCity.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Destination City <span className='text-status-danger-text'>*</span>
                </label>
                <input
                  type="text"
                  {...register('destinationCity')}
                  placeholder="e.g., Delhi"
                  className={cardInputClass(!!errors.destinationCity)}
                />
                {errors.destinationCity && (
                  <p className='mt-1 text-sm text-status-danger-text'>{errors.destinationCity.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Departure Date <span className='text-status-danger-text'>*</span>
                </label>
                <input
                  type="date"
                  {...register('departureDate')}
                  className={cardInputClass(!!errors.departureDate)}
                />
                {errors.departureDate && (
                  <p className='mt-1 text-sm text-status-danger-text'>{errors.departureDate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Return Date <span className='text-status-danger-text'>*</span>
                </label>
                <input
                  type="date"
                  {...register('returnDate')}
                  min={watchedDepartureDate}
                  className={cardInputClass(!!errors.returnDate)}
                />
                {errors.returnDate && (
                  <p className='mt-1 text-sm text-status-danger-text'>{errors.returnDate.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isInternational')}
                  className='w-4 h-4 text-accent bg-[var(--bg-card)] border-[var(--border-main)] rounded focus:ring-accent-500'
                />
                <span className="text-body-secondary">International Travel</span>
              </label>

              {watchedIsInternational && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('visaRequired')}
                    className='w-4 h-4 text-accent bg-[var(--bg-card)] border-[var(--border-main)] rounded focus:ring-accent-500'
                  />
                  <span className="text-body-secondary">Visa Required</span>
                </label>
              )}
            </div>
          </div>

          {/* Transport Details */}
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-main)]">
              <div className='p-2 bg-accent-subtle rounded-lg'>
                <Plane className='h-5 w-5 text-accent'/>
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Transport Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Transport Mode <span className='text-status-danger-text'>*</span>
                </label>
                <select
                  {...register('transportMode')}
                  className={inputClass(!!errors.transportMode)}
                >
                  <option value="FLIGHT">Flight</option>
                  <option value="TRAIN">Train</option>
                  <option value="BUS">Bus</option>
                  <option value="CAR">Car</option>
                  <option value="SELF_ARRANGED">Self Arranged</option>
                </select>
                {errors.transportMode && (
                  <p className='mt-1 text-sm text-status-danger-text'>{errors.transportMode.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Class/Type
                </label>
                <input
                  type="text"
                  {...register('transportClass')}
                  placeholder="e.g., Economy, Business"
                  className={inputClass(false)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('cabRequired')}
                className='w-4 h-4 text-accent bg-[var(--bg-secondary)] border-[var(--border-main)] rounded focus:ring-accent-500'
              />
              <span className="text-body-secondary">Local cab/taxi required</span>
            </label>
          </div>

          {/* Accommodation */}
          <div className="p-6 bg-[var(--bg-secondary)]/50 space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-main)]">
              <div className='p-2 bg-accent-subtle rounded-lg'>
                <Hotel className='h-5 w-5 text-accent'/>
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Accommodation</h2>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('accommodationRequired')}
                className='w-4 h-4 text-accent bg-[var(--bg-card)] border-[var(--border-main)] rounded focus:ring-accent-500'
              />
              <span className="text-body-secondary">Accommodation required</span>
            </label>

            {watchedAccommodation && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Hotel Preference
                  </label>
                  <input
                    type="text"
                    {...register('hotelPreference')}
                    placeholder="Enter preferred hotel or area"
                    className={cardInputClass(false)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Check-in Date <span className='text-status-danger-text'>*</span>
                  </label>
                  <input
                    type="date"
                    {...register('checkInDate')}
                    min={watchedDepartureDate}
                    className={cardInputClass(!!errors.checkInDate)}
                  />
                  {errors.checkInDate && (
                    <p className='mt-1 text-sm text-status-danger-text'>{errors.checkInDate.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Check-out Date <span className='text-status-danger-text'>*</span>
                  </label>
                  <input
                    type="date"
                    {...register('checkOutDate')}
                    className={cardInputClass(!!errors.checkOutDate)}
                  />
                  {errors.checkOutDate && (
                    <p className='mt-1 text-sm text-status-danger-text'>{errors.checkOutDate.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Budget */}
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-main)]">
              <div className='p-2 bg-status-warning-bg rounded-lg'>
                <DollarSign className='h-5 w-5 text-status-warning-text'/>
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Budget Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Estimated Cost (INR) <span className='text-status-danger-text'>*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('estimatedCost', {valueAsNumber: true})}
                  placeholder="0.00"
                  className={inputClass(!!errors.estimatedCost)}
                />
                {errors.estimatedCost && (
                  <p className='mt-1 text-sm text-status-danger-text'>{errors.estimatedCost.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Advance Required (INR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('advanceRequired', {valueAsNumber: true})}
                  placeholder="0.00"
                  className={inputClass(false)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Special Instructions
              </label>
              <textarea
                {...register('specialInstructions')}
                placeholder="Any special requirements or instructions"
                rows={3}
                className={`${inputClass(false)} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 pb-6">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isLoading}
            className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : <Save className="h-5 w-5"/>}
            Save as Draft
          </button>
          <button
            type="button"
            onClick={handleSubmitRequest}
            disabled={isLoading}
            className='flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-500 to-accent-700 hover:from-accent-700 hover:to-accent-700 text-inverse rounded-xl font-medium shadow-[var(--shadow-dropdown)] shadow-accent-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : <Send className="h-5 w-5"/>}
            Submit Request
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
