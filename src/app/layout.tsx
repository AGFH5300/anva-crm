import type { Metadata } from 'next';
import '@/styles/index.css';
import AppLayout from '@/layouts/AppLayout';
import { AuthSessionProvider } from '@/components/auth/AuthSessionProvider';

export const metadata: Metadata = {
  title: 'Anva CRM'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthSessionProvider>
          <AppLayout>{children}</AppLayout>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
