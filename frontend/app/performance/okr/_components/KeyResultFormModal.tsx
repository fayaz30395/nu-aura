'use client';

import {useEffect} from 'react';
import {Controller, useForm, type Control, type FieldPath} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Button, NativeSelect, NumberInput, TextInput, Textarea} from '@mantine/core';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {EMPTY_KEY_RESULT_FORM, keyResultFormSchema, type KeyResultFormData, MEASUREMENT_TYPES} from './okrConfig';

type NumericField = Extract<FieldPath<KeyResultFormData>, 'startValue' | 'targetValue' | 'weight'>;

function NumberField({control, name, id, label, error, ...rest}: {
  control: Control<KeyResultFormData>;
  name: NumericField;
  id: string;
  label: string;
  error?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({field}) => (
        <NumberInput
          id={id}
          label={label}
          value={field.value}
          onChange={(v) => field.onChange(typeof v === 'number' ? v : NaN)}
          onBlur={field.onBlur}
          error={error}
          {...rest}
        />
      )}
    />
  );
}

interface KeyResultFormModalProps {
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (data: KeyResultFormData) => void | Promise<void>;
}

export function KeyResultFormModal({isOpen, isSaving, onClose, onSubmit}: KeyResultFormModalProps) {
  const {register, control, handleSubmit, reset, formState: {errors, isSubmitting}} = useForm<KeyResultFormData>({
    resolver: zodResolver(keyResultFormSchema),
    defaultValues: EMPTY_KEY_RESULT_FORM,
  });

  useEffect(() => {
    if (isOpen) reset(EMPTY_KEY_RESULT_FORM);
  }, [isOpen, reset]);

  const pending = isSaving || isSubmitting;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalHeader onClose={onClose}>Add Key Result</ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <TextInput
            id="key-result-title"
            label="Title *"
            placeholder="What measurable outcome will you achieve?"
            error={errors.title?.message}
            {...register('title')}
          />
          <Textarea id="key-result-description" label="Description" rows={2} {...register('description')}/>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NativeSelect
              id="key-result-measurement-type"
              label="Measurement Type"
              data={[...MEASUREMENT_TYPES]}
              {...register('measurementType')}
            />
            <TextInput id="key-result-unit" label="Unit" placeholder="%" {...register('measurementUnit')}/>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NumberField control={control} name="startValue" id="key-result-start-value" label="Start Value"
                         error={errors.startValue?.message}/>
            <NumberField control={control} name="targetValue" id="key-result-target-value" label="Target Value *"
                         error={errors.targetValue?.message}/>
            <NumberField control={control} name="weight" id="key-result-weight" label="Weight" min={0} max={10}
                         step={0.1} error={errors.weight?.message}/>
          </div>
          <TextInput id="key-result-due-date" type="date" label="Due Date" {...register('dueDate')}/>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="default" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            Add Key Result
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
