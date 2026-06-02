import {Center, Loader} from '@mantine/core';

export default function FnFManagementLoading() {
  return (
    <Center
      h={400}
      className="page-shell-centered fade-slide-up auth-delay-20"
    >
      <Loader size="lg"/>
    </Center>
  );
}
