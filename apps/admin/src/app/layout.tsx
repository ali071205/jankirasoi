import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Janki Rasoi — Kitchen KDS & Admin Console',
  description: 'Kitchen Operations Display System, Order Lifecycle Dispatch & Daily Delivery Slot Management for Janki Rasoi',
  robots: 'noindex, nofollow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-950 font-body text-slate-100 min-h-screen flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
