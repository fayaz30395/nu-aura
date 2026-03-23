'use client';

import React from 'react';
import { BookOpen, Play, Download, Award, Loader2 } from 'lucide-react';
import { Card, CardContent, Button, Badge, EmptyState } from '@/components/ui';
import { EnrollmentStatus } from '@/lib/types/training';
import type { TrainingEnrollment } from '@/lib/types/training';
import { toBadgeVariant } from '@/lib/utils/type-guards';
import { safeWindowOpen } from '@/lib/utils/url';
interface MyTrainingsTabProps {
  enrollments: TrainingEnrollment[];
  loading: boolean;
  onNavigateToCatalog: () => void;
}

export function MyTrainingsTab({ enrollments, loading, onNavigateToCatalog }: MyTrainingsTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="h-8 w-8" />}
        title="No Enrolled Trainings Yet"
        description="Browse the course catalog to find programs and enroll in trainings"
        action={{
          label: 'Browse Catalog',
          onClick: onNavigateToCatalog,
        }}
        iconColor="indigo"
      />
    );
  }

  return (
    <div className="space-y-4">
      {enrollments.map((enrollment) => (
        <Card key={enrollment.id} className="card-aura">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <h3 className="font-semibold text-lg">{enrollment.programName || 'Training Program'}</h3>
                  <Badge variant={toBadgeVariant(enrollment.status)}>
                    {enrollment.status.replace('_', ' ')}
                  </Badge>
                  {enrollment.certificateIssued && (
                    <Badge variant="success">
                      <Award className="h-3 w-3 mr-1" />
                      Certified
                    </Badge>
                  )}
                </div>

                {/* Progress Bar */}
                {enrollment.status === EnrollmentStatus.IN_PROGRESS && (
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-[var(--text-secondary)] mb-1">
                      <span>Progress</span>
                      <span>{enrollment.attendancePercentage || 0}%</span>
                    </div>
                    <div className="w-full bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${enrollment.attendancePercentage || 0}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-[var(--text-secondary)]">Enrolled:</span>
                    <p className="font-medium">
                      {enrollment.enrollmentDate
                        ? new Date(enrollment.enrollmentDate).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  {enrollment.completedAt && (
                    <div>
                      <span className="text-[var(--text-secondary)]">Completed:</span>
                      <p className="font-medium">
                        {new Date(enrollment.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {enrollment.assessmentScore !== undefined && (
                    <div>
                      <span className="text-[var(--text-secondary)]">Score:</span>
                      <p className="font-medium">{enrollment.assessmentScore}%</p>
                    </div>
                  )}
                  {enrollment.attendancePercentage !== undefined && (
                    <div>
                      <span className="text-[var(--text-secondary)]">Attendance:</span>
                      <p className="font-medium">{enrollment.attendancePercentage}%</p>
                    </div>
                  )}
                </div>

                {enrollment.feedback && (
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    <span className="font-medium">Feedback:</span> {enrollment.feedback}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {enrollment.status === EnrollmentStatus.IN_PROGRESS && (
                  <Button size="sm" variant="outline">
                    <Play className="h-4 w-4 mr-1" />
                    Continue
                  </Button>
                )}
                {enrollment.certificateUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => safeWindowOpen(enrollment.certificateUrl, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Certificate
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

