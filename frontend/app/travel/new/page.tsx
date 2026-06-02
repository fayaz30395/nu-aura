'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {AppLayout} from '@/components/layout/AppLayout';
import {TransportMode, TravelType} from '@/lib/types/hrms/travel';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useCreateTravelRequest, useSubmitTravelRequest} from '@/lib/hooks/queries/useTravel';
import {isAxiosError} from '@/lib/utils/type-guards';
import {Card, CardContent} from '@/components/ui/Card';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  DollarSign,
  Hotel,
  Loader2,
  MapPin,
  Plane,
  Save,
  Send,
  ShieldAlert,
} from 'lucide-react';

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
      router.replace('/auth/login');
      return;
    }
    if (!hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [isAuthenticated, hasHydrated, isReady, hasAccess, router]);

  const authShell = (title: string, description: string) => (
    <div className="page-shell-centered fade-slide-up auth-delay-20">
      <Card className="card-aura fade-slide-up auth-delay-40 float-subtle">
        <CardContent className="py-10">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300">
              <ShieldAlert className="h-5 w-5"/>
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
              <p className="text-caption">{description}</p>
            </div>
          </div>
          <Link
            href="/auth/login"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent-700 hover:text-accent-800 transition-colors"
          >
            <Loader2 className="h-4 w-4 animate-spin"/>
            Sign in
            <ArrowRight className="h-4 w-4"/>
          </Link>
        </CardContent>
      </Card>
    </div>
  );

  const watchedAccommodation = watch('accommodationRequired');
  const watchedIsInternational = watch('isInternational');
  const watchedDepartureDate = watch('departureDate');

  if (!hasHydrated || !isAuthenticated || !isReady || !hasAccess) {
    if (!hasHydrated || !isReady || !isAuthenticated) {
      return (
        <AppLayout activeMenuItem="travel">
          {authShell('Travel request access', 'Redirecting to sign in.')}
        </AppLayout>
      );
    }
    return (
      <AppLayout activeMenuItem="travel">
        {authShell('Travel request access', 'Checking permissions...')}
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
      hasError ? 'border-danger-500' : 'border-[var(--border-main)]'
    } rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all`;

  const cardInputClass = (hasError: boolean) =>
    `w-full px-4 py-2.5 bg-[var(--bg-card)] border ${
      hasError ? 'border-danger-500' : 'border-[var(--border-main)]'
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
            <h1 className="text-xl font-bold text-[var(--text-primary)]">New Travel Request</h1>
            <p className="text-[var(--text-muted)] mt-1">Submit a new travel request for approval</p>
          </div>
        </div>

        {(createMutation.isError || submitMutation.isError) && (
          <div
            className="flex items-center gap-4 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-xl">
            <AlertCircle className="h-5 w-5 text-danger-600 dark:text-danger-400 flex-shrink-0"/>
            <p className="text-sm text-danger-600 dark:text-danger-400">Failed to create travel request. Please try
              again.</p>
          </div>
        )}

        <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] overflow-hidden">
          {/* Travel Details */}
          <section aria-labelledby="travel-details-heading" className="p-6 space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-main)]">
              <div className="p-2 bg-accent-100 dark:bg-accent-900/30 rounded-lg">
                <Briefcase className="h-5 w-5 text-accent-700 dark:text-accent-400"/>
              </div>
              <h2 id="travel-details-heading" className="text-xl font-semibold text-[var(--text-primary)]">Travel Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="travel-type" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Travel Type <span aria-hidden="true" className="text-danger-500">*</span>
                </label>
                <select
                  id="travel-type"
                  {...register('travelType')}
                  aria-required="true"
                  aria-invalid={errors.travelType ? 'true' : 'false'}
                  aria-describedby={errors.travelType ? 'travel-type-error' : undefined}
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
                  <p id="travel-type-error" className="mt-1 text-sm text-danger-500">{errors.travelType.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="travel-client-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Client Name
                </label>
                <input
                  id="travel-client-name"
                  type="text"
                  {...register('clientName')}
                  placeholder="Enter client name"
                  className={inputClass(false)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="travel-purpose" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Purpose <span aria-hidden="true" className="text-danger-500">*</span>
              </label>
              <textarea
                id="travel-purpose"
                {...register('purpose')}
                aria-required="true"
                aria-invalid={errors.purpose ? 'true' : 'false'}
                aria-describedby={errors.purpose ? 'travel-purpose-error' : undefined}
                placeholder="Describe the purpose of your travel"
                rows={3}
                className={`${inputClass(!!errors.purpose)} resize-none`}
              />
              {errors.purpose && (
                <p id="travel-purpose-error" className="mt-1 text-sm text-danger-500">{errors.purpose.message}</p>
              )}
            </div>
          </section>

          {/* Journey Details */}
          <section aria-labelledby="journey-details-heading" className="p-6 bg-[var(--bg-secondary)]/50 space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-main)]">
              <div className="p-2 bg-success-100 dark:bg-success-900/30 rounded-lg">
                <MapPin className="h-5 w-5 text-success-600 dark:text-success-400"/>
              </div>
              <h2 id="journey-details-heading" className="text-xl font-semibold text-[var(--text-primary)]">Journey Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="travel-origin-city" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Origin City <span aria-hidden="true" className="text-danger-500">*</span>
                </label>
                <input
                  id="travel-origin-city"
                  type="text"
                  {...register('originCity')}
                  aria-required="true"
                  aria-invalid={errors.originCity ? 'true' : 'false'}
                  aria-describedby={errors.originCity ? 'travel-origin-city-error' : undefined}
                  placeholder="e.g., Mumbai"
                  className={cardInputClass(!!errors.originCity)}
                />
                {errors.originCity && (
                  <p id="travel-origin-city-error" className="mt-1 text-sm text-danger-500">{errors.originCity.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="travel-destination-city" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Destination City <span aria-hidden="true" className="text-danger-500">*</span>
                </label>
                <input
                  id="travel-destination-city"
                  type="text"
                  {...register('destinationCity')}
                  aria-required="true"
                  aria-invalid={errors.destinationCity ? 'true' : 'false'}
                  aria-describedby={errors.destinationCity ? 'travel-destination-city-error' : undefined}
                  placeholder="e.g., Delhi"
                  className={cardInputClass(!!errors.destinationCity)}
                />
                {errors.destinationCity && (
                  <p id="travel-destination-city-error" className="mt-1 text-sm text-danger-500">{errors.destinationCity.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="travel-departure-date" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Departure Date <span aria-hidden="true" className="text-danger-500">*</span>
                </label>
                <input
                  id="travel-departure-date"
                  type="date"
                  {...register('departureDate')}
                  aria-required="true"
                  aria-invalid={errors.departureDate ? 'true' : 'false'}
                  aria-describedby={errors.departureDate ? 'travel-departure-date-error' : undefined}
                  className={cardInputClass(!!errors.departureDate)}
                />
                {errors.departureDate && (
                  <p id="travel-departure-date-error" className="mt-1 text-sm text-danger-500">{errors.departureDate.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="travel-return-date" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Return Date <span aria-hidden="true" className="text-danger-500">*</span>
                </label>
                <input
                  id="travel-return-date"
                  type="date"
                  {...register('returnDate')}
                  min={watchedDepartureDate}
                  aria-required="true"
                  aria-invalid={errors.returnDate ? 'true' : 'false'}
                  aria-describedby={errors.returnDate ? 'travel-return-date-error' : undefined}
                  className={cardInputClass(!!errors.returnDate)}
                />
                {errors.returnDate && (
                  <p id="travel-return-date-error" className="mt-1 text-sm text-danger-500">{errors.returnDate.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isInternational')}
                  className="w-4 h-4 text-accent-700 bg-[var(--bg-card)] border-[var(--border-main)] rounded focus:ring-accent-500"
                />
                <span className="text-body-secondary">International Travel</span>
              </label>

              {watchedIsInternational && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('visaRequired')}
                    className="w-4 h-4 text-accent-700 bg-[var(--bg-card)] border-[var(--border-main)] rounded focus:ring-accent-500"
                  />
                  <span className="text-body-secondary">Visa Required</span>
                </label>
              )}
            </div>
          </section>

          {/* Transport Details */}
          <section aria-labelledby="transport-details-heading" className="p-6 space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-main)]">
              <div className="p-2 bg-accent-100 dark:bg-accent-900/30 rounded-lg">
                <Plane className="h-5 w-5 text-accent-600 dark:text-accent-400"/>
              </div>
              <h2 id="transport-details-heading" className="text-xl font-semibold text-[var(--text-primary)]">Transport Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="travel-transport-mode" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Transport Mode <span aria-hidden="true" className="text-danger-500">*</span>
                </label>
                <select
                  id="travel-transport-mode"
                  {...register('transportMode')}
                  aria-required="true"
                  aria-invalid={errors.transportMode ? 'true' : 'false'}
                  aria-describedby={errors.transportMode ? 'travel-transport-mode-error' : undefined}
                  className={inputClass(!!errors.transportMode)}
                >
                  <option value="FLIGHT">Flight</option>
                  <option value="TRAIN">Train</option>
                  <option value="BUS">Bus</option>
                  <option value="CAR">Car</option>
                  <option value="SELF_ARRANGED">Self Arranged</option>
                </select>
                {errors.transportMode && (
                  <p id="travel-transport-mode-error" className="mt-1 text-sm text-danger-500">{errors.transportMode.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="travel-transport-class" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Class/Type
                </label>
                <input
                  id="travel-transport-class"
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
                className="w-4 h-4 text-accent-700 bg-[var(--bg-secondary)] border-[var(--border-main)] rounded focus:ring-accent-500"
              />
              <span className="text-body-secondary">Local cab/taxi required</span>
            </label>
          </section>

          {/* Accommodation */}
          <section aria-labelledby="accommodation-heading" className="p-6 bg-[var(--bg-secondary)]/50 space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-main)]">
              <div className="p-2 bg-accent-300 dark:bg-accent-900/30 rounded-lg">
                <Hotel className="h-5 w-5 text-accent-800 dark:text-accent-600"/>
              </div>
              <h2 id="accommodation-heading" className="text-xl font-semibold text-[var(--text-primary)]">Accommodation</h2>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('accommodationRequired')}
                className="w-4 h-4 text-accent-700 bg-[var(--bg-card)] border-[var(--border-main)] rounded focus:ring-accent-500"
              />
              <span className="text-body-secondary">Accommodation required</span>
            </label>

            {watchedAccommodation && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-3">
                  <label htmlFor="travel-hotel-preference" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Hotel Preference
                  </label>
                  <input
                    id="travel-hotel-preference"
                    type="text"
                    {...register('hotelPreference')}
                    placeholder="Enter preferred hotel or area"
                    className={cardInputClass(false)}
                  />
                </div>

                <div>
                  <label htmlFor="travel-check-in-date" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Check-in Date <span aria-hidden="true" className="text-danger-500">*</span>
                  </label>
                  <input
                    id="travel-check-in-date"
                    type="date"
                    {...register('checkInDate')}
                    min={watchedDepartureDate}
                    aria-required="true"
                    aria-invalid={errors.checkInDate ? 'true' : 'false'}
                    aria-describedby={errors.checkInDate ? 'travel-check-in-date-error' : undefined}
                    className={cardInputClass(!!errors.checkInDate)}
                  />
                  {errors.checkInDate && (
                    <p id="travel-check-in-date-error" className="mt-1 text-sm text-danger-500">{errors.checkInDate.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="travel-check-out-date" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Check-out Date <span aria-hidden="true" className="text-danger-500">*</span>
                  </label>
                  <input
                    id="travel-check-out-date"
                    type="date"
                    {...register('checkOutDate')}
                    aria-required="true"
                    aria-invalid={errors.checkOutDate ? 'true' : 'false'}
                    aria-describedby={errors.checkOutDate ? 'travel-check-out-date-error' : undefined}
                    className={cardInputClass(!!errors.checkOutDate)}
                  />
                  {errors.checkOutDate && (
                    <p id="travel-check-out-date-error" className="mt-1 text-sm text-danger-500">{errors.checkOutDate.message}</p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Budget */}
          <section aria-labelledby="budget-details-heading" className="p-6 space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-main)]">
              <div className="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-warning-600 dark:text-warning-400"/>
              </div>
              <h2 id="budget-details-heading" className="text-xl font-semibold text-[var(--text-primary)]">Budget Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="travel-estimated-cost" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Estimated Cost (INR) <span aria-hidden="true" className="text-danger-500">*</span>
                </label>
                <input
                  id="travel-estimated-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('estimatedCost', {valueAsNumber: true})}
                  aria-required="true"
                  aria-invalid={errors.estimatedCost ? 'true' : 'false'}
                  aria-describedby={errors.estimatedCost ? 'travel-estimated-cost-error' : undefined}
                  placeholder="0.00"
                  className={inputClass(!!errors.estimatedCost)}
                />
                {errors.estimatedCost && (
                  <p id="travel-estimated-cost-error" className="mt-1 text-sm text-danger-500">{errors.estimatedCost.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="travel-advance-required" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Advance Required (INR)
                </label>
                <input
                  id="travel-advance-required"
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
              <label htmlFor="travel-special-instructions" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Special Instructions
              </label>
              <textarea
                id="travel-special-instructions"
                {...register('specialInstructions')}
                placeholder="Any special requirements or instructions"
                rows={3}
                className={`${inputClass(false)} resize-none`}
              />
            </div>
          </section>
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
            className="flex items-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-xl font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : <Send className="h-5 w-5"/>}
            Submit Request
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
