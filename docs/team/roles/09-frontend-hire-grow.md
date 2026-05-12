# Frontend Engineer - NU-Hire & NU-Grow

**Role**: Frontend Engineer - NU-Hire (Recruitment) & NU-Grow (Performance)  
**Scope**: Job postings, candidate pipeline, interviews, OKRs, reviews, feedback  
**Tech**: Next.js 14, React Hook Form, Zod, React Query, @hello-pangea/dnd

## Core Responsibilities

### 1. Recruitment UI (NU-Hire)

- Job posting creation/management
- Candidate pipeline (drag-and-drop Kanban)
- Interview scheduling (Google Calendar integration)
- Offer letter generation

### 2. Performance UI (NU-Grow)

- OKR dashboard (goals, key results, progress)
- Performance review forms (self, manager, 360)
- 1-on-1 meeting notes
- Feedback submission

### 3. Learning & Development UI

- Training catalog
- Course enrollment
- Completion tracking
- Skill matrix

## Key Patterns

### Kanban Board (Candidate Pipeline)

```tsx
// frontend/components/recruitment/CandidatePipeline.tsx
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export function CandidatePipeline({ jobId }: Props) {
  const { data: pipeline } = useQuery({
    queryKey: ['pipeline', jobId],
    queryFn: () => recruitmentApi.getPipeline(jobId),
  });
  
  const moveMutation = useMutation({
    mutationFn: ({ candidateId, stageId }: MoveRequest) =>
      recruitmentApi.moveCandidate(candidateId, stageId),
    onSuccess: () => queryClient.invalidateQueries(['pipeline', jobId]),
  });
  
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    moveMutation.mutate({
      candidateId: result.draggableId,
      stageId: result.destination.droppableId,
    });
  };
  
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto">
        {pipeline?.stages.map(stage => (
          <Droppable key={stage.id} droppableId={stage.id}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="bg-slate-50 rounded-lg p-4 min-w-[300px]"
              >
                <h3 className="font-semibold mb-4">
                  {stage.name} ({stage.candidates.length})
                </h3>
                
                {stage.candidates.map((candidate, index) => (
                  <Draggable key={candidate.id} draggableId={candidate.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="bg-white rounded p-3 mb-2 shadow-sm"
                      >
                        <div className="font-medium">{candidate.name}</div>
                        <div className="text-sm text-slate-600">{candidate.email}</div>
                        <Badge>{candidate.experience} years exp</Badge>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
```

### OKR Dashboard

```tsx
// frontend/components/performance/OKRDashboard.tsx
export function OKRDashboard({ employeeId, quarter }: Props) {
  const { data: okrs } = useQuery({
    queryKey: ['okrs', employeeId, quarter],
    queryFn: () => performanceApi.getOKRs(employeeId, quarter),
  });
  
  return (
    <div className="space-y-6">
      {okrs?.map(objective => (
        <Card key={objective.id}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{objective.title}</h3>
            <ProgressRing progress={objective.progress} />
          </div>
          
          <div className="space-y-3">
            {objective.keyResults.map(kr => (
              <div key={kr.id} className="border-l-4 border-sky-700 pl-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{kr.title}</span>
                  <span className="text-sm text-slate-600">
                    {kr.current} / {kr.target} {kr.unit}
                  </span>
                </div>
                <Progress value={(kr.current / kr.target) * 100} />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
```

### Performance Review Form

```tsx
// frontend/components/performance/ReviewForm.tsx
const schema = z.object({
  ratings: z.array(z.object({
    competencyId: z.string(),
    rating: z.number().min(1).max(5),
    comments: z.string().min(10),
  })),
  overallRating: z.number().min(1).max(5),
  strengths: z.string().min(50),
  areasForImprovement: z.string().min(50),
  goals: z.array(z.object({
    title: z.string(),
    description: z.string(),
  })),
});

export function ReviewForm({ reviewId }: Props) {
  const form = useForm({
    resolver: zodResolver(schema),
  });
  
  const { data: competencies } = useQuery({
    queryKey: ['competencies'],
    queryFn: performanceApi.getCompetencies,
  });
  
  const mutation = useMutation({
    mutationFn: performanceApi.submitReview,
    onSuccess: () => {
      toast.success('Review submitted');
      router.push('/performance/reviews');
    },
  });
  
  return (
    <form onSubmit={form.handleSubmit(mutation.mutate)}>
      <h2>Competency Ratings</h2>
      {competencies?.map((comp, idx) => (
        <div key={comp.id}>
          <label>{comp.name}</label>
          <RadioGroup
            {...form.register(`ratings.${idx}.rating`)}
            options={[1, 2, 3, 4, 5].map(r => ({
              value: r,
              label: getRatingLabel(r),
            }))}
          />
          <Textarea
            placeholder="Comments"
            {...form.register(`ratings.${idx}.comments`)}
          />
        </div>
      ))}
      
      <h2>Overall Assessment</h2>
      <StarRating {...form.register('overallRating')} />
      
      <Textarea
        label="Strengths"
        {...form.register('strengths')}
        error={form.formState.errors.strengths?.message}
      />
      
      <Textarea
        label="Areas for Improvement"
        {...form.register('areasForImprovement')}
        error={form.formState.errors.areasForImprovement?.message}
      />
      
      <Button type="submit" loading={mutation.isPending}>
        Submit Review
      </Button>
    </form>
  );
}
```

### Interview Scheduler

```tsx
// frontend/components/recruitment/InterviewScheduler.tsx
export function InterviewScheduler({ candidateId }: Props) {
  const form = useForm({
    resolver: zodResolver(schema),
  });
  
  const mutation = useMutation({
    mutationFn: recruitmentApi.scheduleInterview,
    onSuccess: () => {
      toast.success('Interview scheduled and calendar invite sent');
    },
  });
  
  return (
    <form onSubmit={form.handleSubmit(mutation.mutate)}>
      <DateTimePicker
        label="Interview Date & Time"
        {...form.register('startTime')}
      />
      
      <Select
        label="Duration"
        {...form.register('duration')}
        options={[
          { value: 30, label: '30 minutes' },
          { value: 60, label: '1 hour' },
          { value: 90, label: '1.5 hours' },
        ]}
      />
      
      <MultiSelect
        label="Interviewers"
        {...form.register('interviewerIds')}
        data={interviewers}
      />
      
      <Checkbox
        label="Create Google Meet link"
        {...form.register('createMeetLink')}
      />
      
      <Button type="submit" loading={mutation.isPending}>
        Schedule Interview
      </Button>
    </form>
  );
}
```

## Success Criteria

- ✅ Kanban drag-and-drop <100ms latency
- ✅ OKR dashboard loads <1s
- ✅ Review form auto-save every 30s
- ✅ Interview scheduler syncs with Google Calendar <2s
- ✅ Mobile responsive (all modules)

## Escalation Path

**Report to**: Engineering Manager  
**Escalate when**: Drag-and-drop bugs, Google Calendar sync failures, performance degradation
