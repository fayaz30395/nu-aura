'use client';

import { useState } from 'react';
import {
  Modal,
  Stack,
  NumberInput,
  TextInput,
  Textarea,
  Button,
  Group,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recruitmentService } from '@/lib/services/recruitment.service';
import type { Candidate, CreateOfferRequest } from '@/lib/types/recruitment';

interface OfferModalProps {
  opened: boolean;
  onClose: () => void;
  candidate: Candidate;
  jobId: string;
}

export function OfferModal({ opened, onClose, candidate, jobId }: OfferModalProps) {
  const queryClient = useQueryClient();

  const [offeredSalary, setOfferedSalary] = useState<number | string>('');
  const [positionTitle, setPositionTitle] = useState(candidate.currentDesignation ?? '');
  const [joiningDate, setJoiningDate] = useState('');
  const [offerExpiryDate, setOfferExpiryDate] = useState('');
  const [notes, setNotes] = useState('');

  const offerMutation = useMutation({
    mutationFn: (data: CreateOfferRequest) =>
      recruitmentService.createOffer(candidate.id, data),
    onSuccess: () => {
      notifications.show({
        title: 'Offer created',
        message: `Offer letter generated for ${candidate.fullName}`,
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['kanban-candidates', jobId] });
      handleClose();
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error',
        message: err?.response?.data?.message ?? 'Failed to create offer',
        color: 'red',
      });
    },
  });

  function handleClose() {
    setOfferedSalary('');
    setPositionTitle('');
    setJoiningDate('');
    setOfferExpiryDate('');
    setNotes('');
    onClose();
  }

  function handleSubmit() {
    if (!offeredSalary || !joiningDate) {
      notifications.show({
        title: 'Validation error',
        message: 'Offered salary and joining date are required',
        color: 'orange',
      });
      return;
    }

    offerMutation.mutate({
      offeredSalary: Number(offeredSalary),
      positionTitle: positionTitle || undefined,
      joiningDate,
      offerExpiryDate: offerExpiryDate || undefined,
      notes: notes || undefined,
    });
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={600} size="lg">
          Generate Offer Letter — {candidate.fullName}
        </Text>
      }
      size="md"
      centered
    >
      <Stack gap="md">
        <NumberInput
          label="Offered Salary"
          placeholder="e.g. 1200000"
          value={offeredSalary}
          onChange={setOfferedSalary}
          min={0}
          thousandSeparator=","
          required
        />

        <TextInput
          label="Position / Title"
          placeholder="e.g. Senior Software Engineer"
          value={positionTitle}
          onChange={(e) => setPositionTitle(e.currentTarget.value)}
        />

        <TextInput
          label="Joining Date"
          placeholder="YYYY-MM-DD"
          value={joiningDate}
          onChange={(e) => setJoiningDate(e.currentTarget.value)}
          required
          description="Format: YYYY-MM-DD"
        />

        <TextInput
          label="Offer Expiry Date"
          placeholder="YYYY-MM-DD"
          value={offerExpiryDate}
          onChange={(e) => setOfferExpiryDate(e.currentTarget.value)}
          description="Format: YYYY-MM-DD"
        />

        <Textarea
          label="Notes"
          placeholder="Any additional notes for this offer..."
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          minRows={3}
          autosize
        />

        <Group justify="flex-end" gap="sm" mt="xs">
          <Button variant="default" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={offerMutation.isPending}
          >
            Generate Offer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
