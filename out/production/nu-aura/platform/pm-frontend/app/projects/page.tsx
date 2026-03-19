'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { projectApi } from '@/lib/api'
import { Project, PageResponse } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/store'
import { Plus, FolderKanban, Calendar, Users, Target } from 'lucide-react'
import { format } from 'date-fns'

const statusColors: Record<string, string> = {
  PLANNING: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  ON_HOLD: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  ARCHIVED: 'bg-gray-100 text-gray-500',
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
}

export default function ProjectsPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  const { data, isLoading, error } = useQuery<PageResponse<Project>>({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await projectApi.list()
      return response.data
    },
    enabled: isAuthenticated,
  })

  const { data: stats } = useQuery({
    queryKey: ['project-stats'],
    queryFn: async () => {
      const response = await projectApi.getStatistics()
      return response.data
    },
    enabled: isAuthenticated,
  })

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Redirecting to login...</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">Error loading projects</p>
      </div>
    )
  }

  const projects = data?.content || []

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Projects</h1>
            </div>
            <Button onClick={() => router.push('/projects/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.totalProjects}</div>
                <p className="text-muted-foreground text-sm">Total Projects</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{stats.inProgressProjects}</div>
                <p className="text-muted-foreground text-sm">In Progress</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{stats.completedProjects}</div>
                <p className="text-muted-foreground text-sm">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{stats.overdueProjects}</div>
                <p className="text-muted-foreground text-sm">Overdue</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <Card className="p-12 text-center">
            <FolderKanban className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
            <p className="text-muted-foreground mb-4">Create your first project to get started</p>
            <Button onClick={() => router.push('/projects/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge className={statusColors[project.status]}>
                      {project.status.replace('_', ' ')}
                    </Badge>
                    <Badge className={priorityColors[project.priority]}>
                      {project.priority}
                    </Badge>
                  </div>
                  <CardTitle className="mt-2">{project.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{project.projectCode}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{project.progressPercentage}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${project.progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        <span>{project.completedTasks || 0}/{project.totalTasks || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{project.totalMembers || 0}</span>
                      </div>
                      {project.targetEndDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(project.targetEndDate), 'MMM d')}</span>
                        </div>
                      )}
                    </div>

                    {project.isOverdue && (
                      <Badge variant="destructive" className="mt-2">Overdue</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
