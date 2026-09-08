import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ChangeFlow - Software Agency Change Request Tracker',
  description: 'Internal tool for software agencies to rapidly capture client change requests, attach scope/cost/timeline estimates, and dispatch interactive client approvals.',
  icons: {
    icon: '/assets/logo.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface text-on-surface min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}

