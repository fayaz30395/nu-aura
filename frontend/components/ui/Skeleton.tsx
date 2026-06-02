import {cn} from "@/lib/utils"

function Skeleton({
                    className,
                    width,
                    height,
                    ...props
                  }: React.HTMLAttributes<HTMLDivElement> & { width?: string | number; height?: string | number }) {
  const style = {
    ...(props.style as React.CSSProperties),
    ...(width && {width: typeof width === 'number' ? `${width}px` : width}),
    ...(height && {height: typeof height === 'number' ? `${height}px` : height}),
  }
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading content"
      className={cn("skeleton-aura", className)}
      style={style}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

// Text skeleton for inline text
function SkeletonText({
                        className,
                        lines = 1,
                        ...props
                      }: React.HTMLAttributes<HTMLDivElement> & { lines?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading content"
      className={cn("space-y-2", className)}
      {...props}
    >
      {Array.from({length: lines}).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          className={cn(
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  )
}

// Avatar skeleton
function SkeletonAvatar({
                          className,
                          size = "md",
                          ...props
                        }: React.HTMLAttributes<HTMLDivElement> & { size?: "sm" | "md" | "lg" | "xl" }) {
  const sizes = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  }
  const dimension = sizes[size]
  return (
    <Skeleton
      className={cn("rounded-full", className)}
      width={dimension}
      height={dimension}
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
      role="status"
      aria-live="polite"
      aria-label="Loading content"
      className={cn(
        "rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-4 space-y-4",
        className
      )}
      {...props}
    >
      <div className="flex items-center space-x-4">
        <SkeletonAvatar/>
        <div className="space-y-2 flex-1">
          <Skeleton height={16} width="33%"/>
          <Skeleton height={12} width="50%"/>
        </div>
      </div>
      <SkeletonText lines={3}/>
      <span className="sr-only">Loading...</span>
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
    <tr className={cn(className)} aria-hidden="true" {...props}>
      {Array.from({length: columns}).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton height={16} width={i === 0 ? 96 : "100%"}/>
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
      role="status"
      aria-live="polite"
      aria-label="Loading content"
      className={cn("overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)]", className)}
      {...props}
    >
      <span className="sr-only">Loading...</span>
      <table className="w-full">
        <thead className="bg-[var(--bg-surface)]">
        <tr className="border-b border-[var(--border-main)]">
          {Array.from({length: columns}).map((_, i) => (
            <th key={i} className="px-4 py-2 text-left">
              <Skeleton height={16} width={80}/>
            </th>
          ))}
        </tr>
        </thead>
        <tbody>
        {Array.from({length: rows}).map((_, i) => (
          <SkeletonTableRow key={i} columns={columns}/>
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
      role="status"
      aria-live="polite"
      aria-label="Loading content"
      className={cn("rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-4", className)}
      {...props}
    >
      <div className="row-between">
        <Skeleton height={16} width={96}/>
        <Skeleton height={32} width={32} className="rounded-lg"/>
      </div>
      <Skeleton height={32} width={80} className="mt-2"/>
      <Skeleton height={12} width={128} className="mt-2"/>
      <span className="sr-only">Loading...</span>
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
      role="status"
      aria-live="polite"
      aria-label="Loading content"
      className={cn("flex items-center space-x-4 py-4", className)}
      {...props}
    >
      {hasAvatar && <SkeletonAvatar/>}
      <div className="flex-1 space-y-2">
        <Skeleton height={16} width="66%"/>
        <Skeleton height={12} width="33%"/>
      </div>
      <Skeleton height={32} width={80} className="rounded-md"/>
      <span className="sr-only">Loading...</span>
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
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading content"
      className={cn("space-y-6", className)}
      {...props}
    >
      {Array.from({length: fields}).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton height={16} width={96}/>
          <Skeleton height={40} width="100%" className="rounded-md"/>
        </div>
      ))}
      <div className="flex justify-end space-x-4 pt-4">
        <Skeleton height={40} width={96} className="rounded-md"/>
        <Skeleton height={40} width={96} className="rounded-md"/>
      </div>
      <span className="sr-only">Loading...</span>
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
      role="status"
      aria-live="polite"
      aria-label="Loading content"
      className={cn("rounded-lg border p-4", className)}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-main)',
      }}
      {...props}
    >
      <div className="flex items-center space-x-4">
        <SkeletonAvatar size="lg"/>
        <div className="flex-1 space-y-2">
          <Skeleton height={20} width={128}/>
          <Skeleton height={12} width={96}/>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center space-x-2">
          <Skeleton height={16} width={16}/>
          <Skeleton height={12} width={112}/>
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton height={16} width={16}/>
          <Skeleton height={12} width={144}/>
        </div>
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  )
}

// Dashboard skeleton
function SkeletonDashboard({
                             className,
                             ...props
                           }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading content"
      className={cn("space-y-4", className)}
      {...props}
    >
      <span className="sr-only">Loading...</span>
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({length: 4}).map((_, i) => (
          <SkeletonStatCard key={i}/>
        ))}
      </div>
      {/* Charts/content row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-main)',
          }}
        >
          <Skeleton height={16} width={128} className="mb-4"/>
          <Skeleton height={200} width="100%"/>
        </div>
        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-main)',
          }}
        >
          <Skeleton height={20} width={128} className="mb-4"/>
          <div className="space-y-4">
            {Array.from({length: 5}).map((_, i) => (
              <SkeletonListItem key={i}/>
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
