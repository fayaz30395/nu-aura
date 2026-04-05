'use client';

import {useParams} from 'next/navigation';
import {useMutation, useQuery} from '@tanstack/react-query';
import {publicApiClient} from '@/lib/api/public-client';
import {
  Alert,
  Button,
  Center,
  Checkbox,
  Group,
  Loader,
  Paper,
  Rating,
  Select,
  Stack,
  Stepper,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import {useState} from 'react';
import {notifications} from '@mantine/notifications';
import {IconAlertCircle, IconCheck} from '@tabler/icons-react';

interface ExitInterviewData {
  status: string;
  employeeName: string;
}

const LEAVING_REASONS = [
  {value: 'BETTER_OPPORTUNITY', label: 'Better Opportunity'},
  {value: 'COMPENSATION', label: 'Compensation'},
  {value: 'CAREER_GROWTH', label: 'Career Growth'},
  {value: 'WORK_LIFE_BALANCE', label: 'Work-Life Balance'},
  {value: 'MANAGEMENT_ISSUES', label: 'Management Issues'},
  {value: 'RELOCATION', label: 'Relocation'},
  {value: 'PERSONAL_REASONS', label: 'Personal Reasons'},
  {value: 'HEALTH_ISSUES', label: 'Health Issues'},
  {value: 'HIGHER_EDUCATION', label: 'Higher Education'},
  {value: 'STARTING_OWN_BUSINESS', label: 'Starting Own Business'},
  {value: 'RETIREMENT', label: 'Retirement'},
  {value: 'COMPANY_CULTURE', label: 'Company Culture'},
  {value: 'JOB_SECURITY', label: 'Job Security'},
  {value: 'OTHER', label: 'Other'},
];

async function fetchInterview(token: string): Promise<ExitInterviewData> {
  const res = await publicApiClient.get<ExitInterviewData>(`/exit/interview/public/${token}`);
  return res.data;
}

async function submitInterview(token: string, data: object): Promise<void> {
  await publicApiClient.post(`/exit/interview/public/${token}/submit`, data);
}

export default function PublicExitInterviewPage() {
  const {token} = useParams<{ token: string }>();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const [ratings, setRatings] = useState({
    overallExperienceRating: 0,
    managementRating: 0,
    workLifeBalanceRating: 0,
    growthOpportunitiesRating: 0,
    compensationRating: 0,
    teamCultureRating: 0,
  });
  const [primaryReasonForLeaving, setPrimaryReasonForLeaving] = useState<string | null>(null);
  const [detailedReason, setDetailedReason] = useState('');
  const [whatLikedMost, setWhatLikedMost] = useState('');
  const [whatCouldImprove, setWhatCouldImprove] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(false);
  const [wouldReturn, setWouldReturn] = useState(false);
  const [newEmployer, setNewEmployer] = useState('');
  const [newRole, setNewRole] = useState('');

  const {data, isLoading, error} = useQuery({
    queryKey: ['exit-interview-public', token],
    queryFn: () => fetchInterview(token),
  });

  const submitMutation = useMutation({
    mutationFn: () => submitInterview(token, {
      ...ratings,
      primaryReasonForLeaving,
      detailedReason,
      whatLikedMost,
      whatCouldImprove,
      suggestions,
      wouldRecommendCompany: wouldRecommend,
      wouldConsiderReturning: wouldReturn,
      newEmployer: newEmployer || undefined,
      newRole: newRole || undefined,
    }),
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: () => {
      notifications.show({title: 'Error', message: 'Could not submit. Please try again.', color: 'red'});
    },
  });

  if (isLoading) return <Center h="100vh"><Loader/></Center>;

  if (error) return (
    <Center h="100vh">
      <Alert icon={<IconAlertCircle size={16}/>} color="red" title="Invalid Link">
        This exit interview link is invalid or has expired. Please contact HR.
      </Alert>
    </Center>
  );

  if (submitted || data?.status === 'COMPLETED') return (
    <Center h="100vh">
      <Paper withBorder p="xl" maw={500} ta="center">
        <IconCheck size={48} color="green"/>
        <Title order={3} mt="md">Thank you!</Title>
        <Text c="dimmed" mt="sm">
          Your exit interview has been submitted. We appreciate your feedback and wish you all the best.
        </Text>
      </Paper>
    </Center>
  );

  const RatingRow = ({label, field}: { label: string; field: keyof typeof ratings }) => (
    <Group justify="space-between" py="xs">
      <Text size="sm">{label}</Text>
      <Rating
        value={ratings[field]}
        onChange={(val) => setRatings((prev) => ({...prev, [field]: val}))}
      />
    </Group>
  );

  return (
    <Center mih="100vh" bg="gray.0" p="md">
      <Paper withBorder p="xl" w="100%" maw={640}>
        <Title order={2} mb={4} className="skeuo-emboss">Exit Interview</Title>
        <Text c="dimmed" size="sm" mb="lg">
          Hi {data?.employeeName}, please share your honest feedback. This is confidential.
        </Text>

        <Stepper active={step} onStepClick={setStep} mb="xl">
          <Stepper.Step label="Ratings" description="Rate your experience"/>
          <Stepper.Step label="Reasons" description="Why are you leaving?"/>
          <Stepper.Step label="Feedback" description="Your thoughts"/>
          <Stepper.Step label="Review" description="Submit"/>
        </Stepper>

        {step === 0 && (
          <Stack gap="xs">
            <Title order={5} mb="xs">How would you rate these aspects?</Title>
            <RatingRow label="Overall Experience" field="overallExperienceRating"/>
            <RatingRow label="Management & Leadership" field="managementRating"/>
            <RatingRow label="Work-Life Balance" field="workLifeBalanceRating"/>
            <RatingRow label="Growth Opportunities" field="growthOpportunitiesRating"/>
            <RatingRow label="Compensation & Benefits" field="compensationRating"/>
            <RatingRow label="Team Culture" field="teamCultureRating"/>
          </Stack>
        )}

        {step === 1 && (
          <Stack gap="sm">
            <Select
              label="Primary reason for leaving"
              data={LEAVING_REASONS}
              value={primaryReasonForLeaving}
              onChange={setPrimaryReasonForLeaving}
              required
            />
            <Textarea
              label="Tell us more about your decision"
              value={detailedReason}
              onChange={(e) => setDetailedReason(e.currentTarget.value)}
              rows={4}
            />
            <TextInput label="New Employer (optional)" value={newEmployer}
                       onChange={(e) => setNewEmployer(e.currentTarget.value)}/>
            <TextInput label="New Role (optional)" value={newRole} onChange={(e) => setNewRole(e.currentTarget.value)}/>
          </Stack>
        )}

        {step === 2 && (
          <Stack gap="sm">
            <Textarea
              label="What did you like most about working here?"
              value={whatLikedMost}
              onChange={(e) => setWhatLikedMost(e.currentTarget.value)}
              rows={3}
            />
            <Textarea
              label="What could we improve?"
              value={whatCouldImprove}
              onChange={(e) => setWhatCouldImprove(e.currentTarget.value)}
              rows={3}
            />
            <Textarea
              label="Any other suggestions?"
              value={suggestions}
              onChange={(e) => setSuggestions(e.currentTarget.value)}
              rows={3}
            />
            <Group>
              <Checkbox
                label="I would recommend this company to others"
                checked={wouldRecommend}
                onChange={(e) => setWouldRecommend(e.currentTarget.checked)}
              />
            </Group>
            <Group>
              <Checkbox
                label="I would consider returning in the future"
                checked={wouldReturn}
                onChange={(e) => setWouldReturn(e.currentTarget.checked)}
              />
            </Group>
          </Stack>
        )}

        {step === 3 && (
          <Stack gap="sm">
            <Alert color="blue" title="Ready to submit">
              Please review your responses above. Once submitted, you cannot make changes.
            </Alert>
            <Text size="sm">Overall Rating: {ratings.overallExperienceRating}/5</Text>
            <Text size="sm">Reason for leaving: {primaryReasonForLeaving ?? 'Not specified'}</Text>
          </Stack>
        )}

        <Group justify="space-between" mt="xl">
          <Button variant="subtle" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)}>Next</Button>
          ) : (
            <Button
              color="green"
              loading={submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
              className="btn-primary"
            >
              Submit Interview
            </Button>
          )}
        </Group>
      </Paper>
    </Center>
  );
}

// Need TextInput for this page
function TextInput({label, value, onChange}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div>
      <Text size="sm" fw={500} mb={4}>{label}</Text>
      <input
        type="text"
        value={value}
        onChange={onChange}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #dee2e6',
          borderRadius: 4,
          fontSize: 14,
        }}
      />
    </div>
  );
}
