'use client';

import {AlertCircle, Calendar, CreditCard, Edit2, Save, SendHorizonal, Shield, User, X} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {PageTransition} from '@/components/motion';
import {Button} from '@/components/ui/Button';
import {Callout} from '@/components/ui/Callout';
import {EmptyState} from '@/components/ui/EmptyState';
import {PageHeader} from '@/components/ui/PageHeader';
import {DetailPageSkeleton} from '@/components/ui/skeletons';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {formatDate as formatDateCanonical} from '@/lib/utils/format/date';
import {useProfileForms} from './_hooks/useProfileForms';
import {ProfileHeaderCard} from './_components/ProfileHeaderCard';
import {ProfileEditableSections} from './_components/ProfileEditableSections';
import {ProfileSection, ProfileValue} from './_components/ProfileSection';
import {BankChangeModal} from './_components/BankChangeModal';

const BREADCRUMBS = [{label: 'My Space', href: '/me/dashboard'}, {label: 'Profile'}];

const formatDate = (date?: string) => {
  if (!date) return 'N/A';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return formatDateCanonical(parsed);
};

const formatEnumValue = (value?: string) => (value ? value.replace(/_/g, ' ') : 'N/A');

export default function MyProfilePage() {
  const profile = useProfileForms();
  const {employee, user, isEditing, savePending} = profile;

  if (profile.isActuallyLoading) {
    return (
      <AppLayout activeMenuItem="profile">
        <DetailPageSkeleton sections={4}/>
      </AppLayout>
    );
  }

  if (!employee) {
    return (
      <AppLayout activeMenuItem="profile">
        <PageTransition className="flex flex-col gap-6">
          <PageHeader title="My Profile" description="Manage your personal information" breadcrumbs={BREADCRUMBS}/>
          <EmptyState
            icon={<AlertCircle className="h-8 w-8" aria-hidden="true"/>}
            title="Profile Not Found"
            description={profile.error || 'Unable to load your profile. Please try again or contact your administrator.'}
          />
        </PageTransition>
      </AppLayout>
    );
  }

  const displayName = employee.fullName
    || [employee.firstName, employee.lastName].filter(Boolean).join(' ')
    || employee.workEmail
    || employee.employeeCode
    || 'Employee';

  const headerActions = !isEditing ? (
    <Button variant="primary" leftIcon={<Edit2 className="h-4 w-4" aria-hidden="true"/>} onClick={profile.startEditing}>
      Edit Profile
    </Button>
  ) : (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        leftIcon={<X className="h-4 w-4" aria-hidden="true"/>}
        onClick={profile.handleCancel}
        disabled={savePending}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        leftIcon={<Save className="h-4 w-4" aria-hidden="true"/>}
        onClick={profile.submitProfile}
        isLoading={savePending}
        loadingText="Saving..."
      >
        Save Changes
      </Button>
    </div>
  );

  return (
    <AppLayout activeMenuItem="profile">
      <PageTransition className="flex flex-col gap-6">
        <PageHeader
          title="My Profile"
          description="Manage your personal information"
          breadcrumbs={BREADCRUMBS}
          actions={headerActions}
        />

        {profile.success && (
          <div role="status">
            <Callout tone="success">Profile updated successfully!</Callout>
          </div>
        )}
        {profile.error && (
          <div role="alert">
            <Callout tone="danger">{profile.error}</Callout>
          </div>
        )}

        <ProfileHeaderCard
          displayName={displayName}
          designation={employee.designation}
          photoUrl={employee.profilePhotoUrl || user?.profilePictureUrl}
          workEmail={employee.workEmail}
          employeeCode={employee.employeeCode}
          departmentName={employee.departmentName}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ProfileSection icon={<User className="h-4 w-4"/>} title="Personal Information" description="Your basic personal details">
            <ProfileValue label="Full Name" value={displayName}/>
            <ProfileValue label="Date of Birth" value={employee.dateOfBirth ? formatDate(employee.dateOfBirth) : 'Not provided'}/>
            <ProfileValue label="Gender" value={employee.gender || 'Not provided'}/>
          </ProfileSection>

          <ProfileEditableSections employee={employee} isEditing={isEditing} form={profile.profileForm}/>

          <ProfileSection icon={<Calendar className="h-4 w-4"/>} title="Employment Details" description="Your work-related information">
            <ProfileValue label="Joining Date" value={formatDate(employee.joiningDate)}/>
            <ProfileValue label="Employment Type" value={formatEnumValue(employee.employmentType)}/>
            <ProfileValue label="Department" value={employee.departmentName || 'N/A'}/>
            <ProfileValue label="Reporting Manager" value={employee.managerName || 'N/A'}/>
            <div>
              <span className="block text-xs font-medium text-text-3">Status</span>
              <StatusBadge
                className="mt-1"
                label={employee.status}
                tone={employee.status === 'ACTIVE' ? 'success' : 'neutral'}
                iconHidden
              />
            </div>
          </ProfileSection>

          <ProfileSection
            icon={<CreditCard className="h-4 w-4"/>}
            title="Bank Details"
            description="Your salary account information"
            className="lg:col-span-2"
            bodyClassName="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
            action={
              <Button
                variant="soft"
                leftIcon={<SendHorizonal className="h-4 w-4" aria-hidden="true"/>}
                onClick={profile.openBankChange}
              >
                Request Change
              </Button>
            }
          >
            <ProfileValue label="Bank Name" value={employee.bankName || 'Not provided'}/>
            <ProfileValue
              label="Account Number"
              mono
              value={employee.bankAccountNumber ? `****${employee.bankAccountNumber.slice(-4)}` : 'Not provided'}
            />
            <ProfileValue label="IFSC Code" mono value={employee.bankIfscCode || 'Not provided'}/>
          </ProfileSection>

          <ProfileSection
            icon={<Shield className="h-4 w-4"/>}
            title="Tax Information"
            description="Your tax identification details"
            className="lg:col-span-2"
          >
            <ProfileValue label="PAN Number" mono value={employee.taxId || 'Not provided'}/>
          </ProfileSection>
        </div>
      </PageTransition>

      <BankChangeModal
        isOpen={profile.showBankChangeModal}
        onClose={profile.closeBankChange}
        form={profile.bankChangeForm}
        submitting={profile.bankChangeSubmitting}
        submitted={profile.bankChangeSuccess}
        onSubmit={profile.submitBankChange}
      />
    </AppLayout>
  );
}
