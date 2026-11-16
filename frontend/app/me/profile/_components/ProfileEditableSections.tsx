'use client';

import {MapPin, Phone} from 'lucide-react';
import {Textarea, TextInput} from '@mantine/core';
import type {UseFormReturn} from 'react-hook-form';
import type {Employee} from '@/lib/types/hrms/employee';
import type {ProfileFormData} from '../_hooks/useProfileForms';
import {ProfileSection, ProfileValue} from './ProfileSection';

interface ProfileEditableSectionsProps {
  employee: Employee;
  isEditing: boolean;
  form: UseFormReturn<ProfileFormData>;
}

export function ProfileEditableSections({employee, isEditing, form}: ProfileEditableSectionsProps) {
  const {register, formState: {errors}} = form;

  return (
    <>
      <ProfileSection icon={<Phone className="h-4 w-4"/>} title="Contact Information" description="How to reach you">
        <ProfileValue label="Work Email" value={employee.workEmail}/>
        {isEditing ? (
          <>
            <TextInput
              id="profile-personal-email"
              type="email"
              label="Personal Email"
              autoComplete="email"
              error={errors.personalEmail?.message}
              {...register('personalEmail')}
            />
            <TextInput
              id="profile-phone-number"
              type="tel"
              label="Phone Number"
              autoComplete="tel"
              {...register('phoneNumber')}
            />
            <TextInput
              id="profile-emergency-contact"
              type="tel"
              label="Emergency Contact"
              {...register('emergencyContactNumber')}
            />
          </>
        ) : (
          <>
            <ProfileValue label="Personal Email" value={employee.personalEmail || 'Not provided'}/>
            <ProfileValue label="Phone Number" value={employee.phoneNumber || 'Not provided'}/>
            <ProfileValue label="Emergency Contact" value={employee.emergencyContactNumber || 'Not provided'}/>
          </>
        )}
      </ProfileSection>

      <ProfileSection icon={<MapPin className="h-4 w-4"/>} title="Address" description="Your residential address">
        {isEditing ? (
          <>
            <Textarea
              id="profile-address"
              label="Street Address"
              autoComplete="street-address"
              rows={2}
              {...register('address')}
            />
            <div className="grid grid-cols-2 gap-4">
              <TextInput id="profile-city" label="City" autoComplete="address-level2" {...register('city')}/>
              <TextInput id="profile-state" label="State" autoComplete="address-level1" {...register('state')}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextInput id="profile-postal-code" label="Postal Code" autoComplete="postal-code" {...register('postalCode')}/>
              <TextInput id="profile-country" label="Country" autoComplete="country-name" {...register('country')}/>
            </div>
          </>
        ) : (
          <>
            <ProfileValue label="Street Address" value={employee.address || 'Not provided'}/>
            <div className="grid grid-cols-2 gap-4">
              <ProfileValue label="City" value={employee.city || 'N/A'}/>
              <ProfileValue label="State" value={employee.state || 'N/A'}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ProfileValue label="Postal Code" value={employee.postalCode || 'N/A'}/>
              <ProfileValue label="Country" value={employee.country || 'N/A'}/>
            </div>
          </>
        )}
      </ProfileSection>
    </>
  );
}
