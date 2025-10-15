"use client";

import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { AuthUIProvider } from '@daveyplate/better-auth-ui';
import { authClient } from '../lib/auth-client';
import { Toaster, toast } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthUIProvider
        authClient={authClient}
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
