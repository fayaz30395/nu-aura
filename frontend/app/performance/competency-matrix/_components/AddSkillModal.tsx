'use client';

import {useEffect} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Select, TextInput} from '@mantine/core';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {
  ADD_SKILL_DEFAULTS,
  addSkillSchema,
  type AddSkillFormValues,
  categoryOptions,
  proficiencyOptions,
  sourceOptions,
} from './competencyMatrixConfig';

interface AddSkillModalProps {
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: AddSkillFormValues) => Promise<void>;
}

export function AddSkillModal({isOpen, isSaving, onClose, onSubmit}: AddSkillModalProps) {
  const {control, handleSubmit, reset, formState: {isSubmitting}} = useForm<AddSkillFormValues>({
    resolver: zodResolver(addSkillSchema),
    defaultValues: ADD_SKILL_DEFAULTS,
  });

  useEffect(() => {
    if (isOpen) reset(ADD_SKILL_DEFAULTS);
  }, [isOpen, reset]);

  const pending = isSaving || isSubmitting;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalHeader onClose={onClose}>Add Skill</ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <Controller
            name="skillName"
            control={control}
            render={({field, fieldState}) => (
              <TextInput
                id="add-skill-name"
                label="Skill Name"
                placeholder="e.g., Java, Leadership, Data Analysis"
                required
                error={fieldState.error?.message}
                {...field}
              />
            )}
          />
          <Controller
            name="category"
            control={control}
            render={({field, fieldState}) => (
              <Select
                id="add-skill-category"
                label="Category"
                data={categoryOptions}
                required
                error={fieldState.error?.message}
                {...field}
              />
            )}
          />
          <Controller
            name="proficiencyLevel"
            control={control}
            render={({field, fieldState}) => (
              <Select
                id="add-skill-proficiency"
                label="Proficiency Level"
                data={proficiencyOptions}
                required
                error={fieldState.error?.message}
                value={String(field.value)}
                onChange={(val) => field.onChange(val ? Number(val) : 1)}
              />
            )}
          />
          <Controller
            name="source"
            control={control}
            render={({field, fieldState}) => (
              <Select
                id="add-skill-source"
                label="Assessment Source"
                data={sourceOptions}
                required
                error={fieldState.error?.message}
                {...field}
              />
            )}
          />
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="default" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            Save Skill
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
