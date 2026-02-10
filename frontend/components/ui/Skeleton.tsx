import { cn } from "@/lib/utils"

function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-surface-200 dark:bg-surface-700", className)}
            {...props}
        />
    )
}

// Text skeleton for inline text
function SkeletonText({
    className,
    lines = 1,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & { lines?: number }) {
    return (
        <div className={cn("space-y-2", className)} {...props}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={cn(
                        "h-4",
                        i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
                    )}
                />
            ))}
        </div>
    )
}

// Avatar skeleton
function SkeletonAvatar({
    className,
    size = "md",
    ...props
}: React.HTMLAttributes<HTMLDivElement> & { size?: "sm" | "md" | "lg" | "xl" }) {
    const sizeClasses = {
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-12 w-12",
        xl: "h-16 w-16",
    }
    return (
        <Skeleton
            className={cn("rounded-full", sizeClasses[size], className)}
            {...props}
        />
    )
}

// Card skeleton
function SkeletonCard({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "rounded-lg border border-surface-200 dark:border-surface-700 p-4 space-y-4",
                className
            )}
            {...props}
        >
            <div className="flex items-center space-x-4">
                <SkeletonAvatar />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
            <SkeletonText lines={3} />
        </div>
    )
}

// Table row skeleton
function SkeletonTableRow({
    className,
    columns = 4,
    ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { columns?: number }) {
    return (
        <tr className={cn("animate-pulse", className)} {...props}>
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <Skeleton className={cn("h-4", i === 0 ? "w-24" : "w-full")} />
                </td>
            ))}
        </tr>
    )
}

// Table skeleton
function SkeletonTable({
    className,
    rows = 5,
    columns = 4,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & { rows?: number; columns?: number }) {
    return (
        <div
            className={cn("overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700", className)}
            {...props}
        >
            <table className="w-full">
                <thead className="bg-surface-50 dark:bg-surface-800">
                    <tr>
                        {Array.from({ length: columns }).map((_, i) => (
                            <th key={i} className="px-4 py-3 text-left">
                                <Skeleton className="h-4 w-20" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                    {Array.from({ length: rows }).map((_, i) => (
                        <SkeletonTableRow key={i} columns={columns} />
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// Stat card skeleton
function SkeletonStatCard({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "rounded-lg border border-surface-200 dark:border-surface-700 p-4",
                className
            )}
            {...props}
        >
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-20 mt-2" />
            <Skeleton className="h-3 w-32 mt-2" />
        </div>
    )
}

// List item skeleton
function SkeletonListItem({
    className,
    hasAvatar = true,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & { hasAvatar?: boolean }) {
    return (
        <div
            className={cn("flex items-center space-x-4 py-3", className)}
            {...props}
        >
            {hasAvatar && <SkeletonAvatar />}
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
        </div>
    )
}

// Form skeleton
function SkeletonForm({
    className,
    fields = 4,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & { fields?: number }) {
    return (
        <div className={cn("space-y-6", className)} {...props}>
            {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>
            ))}
            <div className="flex justify-end space-x-3 pt-4">
                <Skeleton className="h-10 w-24 rounded-md" />
                <Skeleton className="h-10 w-24 rounded-md" />
            </div>
        </div>
    )
}

// Employee card skeleton (specific for employee directory)
function SkeletonEmployeeCard({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "rounded-lg border border-surface-200 dark:border-surface-700 p-4",
                className
            )}
            {...props}
        >
            <div className="flex items-center space-x-4">
                <SkeletonAvatar size="lg" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-24" />
                </div>
            </div>
            <div className="mt-4 space-y-2">
                <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-3 w-28" />
                </div>
                <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-3 w-36" />
                </div>
            </div>
        </div>
    )
}

// Dashboard skeleton
function SkeletonDashboard({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("space-y-6", className)} {...props}>
            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonStatCard key={i} />
                ))}
            </div>
            {/* Charts/content row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-lg border border-surface-200 dark:border-surface-700 p-4">
                    <Skeleton className="h-5 w-32 mb-4" />
                    <Skeleton className="h-64 w-full" />
                </div>
                <div className="rounded-lg border border-surface-200 dark:border-surface-700 p-4">
                    <Skeleton className="h-5 w-32 mb-4" />
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <SkeletonListItem key={i} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export {
    Skeleton,
    SkeletonText,
    SkeletonAvatar,
    SkeletonCard,
    SkeletonTableRow,
    SkeletonTable,
    SkeletonStatCard,
    SkeletonListItem,
    SkeletonForm,
    SkeletonEmployeeCard,
    SkeletonDashboard,
}
