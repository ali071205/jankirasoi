import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '../context/CartContext';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

export const metadata: Metadata = {
  title: 'Janki Rasoi — Ghar Jaisa Khana, Har Din',
  description: 'Pure vegetarian North Indian homestyle tiffin meal ordering with live delivery slots and live kitchen tracking in Delhi NCR.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface font-body text-on-surface flex flex-col min-h-screen">
        <CartProvider>
          <Header />
          <div className="flex-1 flex flex-col">{children}</div>
          <BottomNav />
        </CartProvider>
      </body>
    </html>
  );
}
