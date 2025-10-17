"use client";

import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { AuthUIProvider } from '@daveyplate/better-auth-ui';
import { authClient } from '../lib/auth-client';
import { Toaster, toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <I18nextProvider i18n={i18n}>
      <AuthUIProvider
        authClient={authClient}
        navigate={router.push}
        replace={router.replace}
        onSessionChange={() => {
          router.refresh();
        }}
        Link={Link}
        toast={(message) => {
          if (message.variant === 'error') {
            toast.error(message.message);
          } else {
            toast.success(message.message);
          }
        }}
      >
        <Toaster />
        {children}
      </AuthUIProvider>
    </I18nextProvider>
  );
}