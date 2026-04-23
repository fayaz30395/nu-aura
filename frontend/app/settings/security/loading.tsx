'use client';

import {Card, Container, Group, Skeleton, Stack} from '@mantine/core';

/**
 * Loading skeleton for security settings page
 * Displays placeholder content while security settings are being fetched
 */
export default function SecuritySettingsLoading() {
  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <div>
          <Skeleton height={32} width={200} mb="md"/>
          <Skeleton height={16} width={400}/>
        </div>

        {/* MFA Section */}
        <Card withBorder padding="lg">
          <Stack gap="md">
            {/* Card Header */}
            <Group justify="space-between" align="center">
              <Skeleton height={24} width={200}/>
              <Skeleton height={32} width={100}/>
            </Group>

            {/* MFA Status */}
            <div>
              <Skeleton height={16} width={150} mb="sm"/>
              <Skeleton height={20} width={100}/>
            </div>

            {/* MFA Details */}
            <Stack gap="xs">
              <Group gap="sm">
                <Skeleton height={20} width={120}/>
                <Skeleton height={20} width={80}/>
              </Group>
              <Skeleton height={16} width="100%"/>
              <Skeleton height={16} width="95%"/>
            </Stack>

            {/* Action Buttons */}
            <Group gap="md">
              <Skeleton height={36} width={140}/>
              <Skeleton height={36} width={140}/>
            </Group>
          </Stack>
        </Card>

        {/* Password Section */}
        <Card withBorder padding="lg">
          <Stack gap="md">
            {/* Card Header */}
            <Skeleton height={24} width={250} mb="md"/>

            {/* Form Fields */}
            <Stack gap="sm">
              <div>
                <Skeleton height={14} width={120} mb="xs"/>
                <Skeleton height={36} width="100%"/>
              </div>
              <div>
                <Skeleton height={14} width={140} mb="xs"/>
                <Skeleton height={36} width="100%"/>
              </div>
              <div>
                <Skeleton height={14} width={160} mb="xs"/>
                <Skeleton height={36} width="100%"/>
              </div>
            </Stack>

            {/* Button */}
            <Skeleton height={36} width={120}/>
          </Stack>
        </Card>

        {/* Sessions Section */}
        <Card withBorder padding="lg">
          <Stack gap="md">
            {/* Card Header */}
            <Skeleton height={24} width={200} mb="md"/>

            {/* Session List */}
            {[1, 2, 3].map((i) => (
              <Group key={i} justify="space-between" align="center" pb="md" style={{borderBottom: '1px solid var(--border-main)'}}>
                <Stack gap="xs" style={{flex: 1}}>
                  <Skeleton height={16} width={200}/>
                  <Skeleton height={14} width={300}/>
                </Stack>
                <Skeleton height={32} width={80}/>
              </Group>
            ))}
          </Stack>
        </Card>

        {/* Two-Factor Authentication History */}
        <Card withBorder padding="lg">
          <Stack gap="md">
            {/* Card Header */}
            <Skeleton height={24} width={280} mb="md"/>

            {/* History List */}
            {[1, 2].map((i) => (
              <Group key={i} justify="space-between" align="flex-start" pb="md"
                     style={{borderBottom: '1px solid var(--border-main)'}}>
                <Stack gap="xs" style={{flex: 1}}>
                  <Skeleton height={16} width={150}/>
                  <Skeleton height={14} width={250}/>
                </Stack>
                <Skeleton height={20} width={70}/>
              </Group>
            ))}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
