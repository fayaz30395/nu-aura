'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect to HRMS for authentication
      const hrmsUrl = process.env.NEXT_PUBLIC_HRMS_URL || 'http://localhost:3000'
      window.location.href = `${hrmsUrl}/auth/login?redirect=${encodeURIComponent(window.location.origin)}`
    } else {
      router.push('/projects')
    }
  }, [isAuthenticated, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
