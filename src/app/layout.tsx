import type { Metadata } from 'next';
import '@/styles/index.css';
import AppLayout from '@/layouts/AppLayout';

export const metadata: Metadata = {
  title: 'Anva CRM'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
