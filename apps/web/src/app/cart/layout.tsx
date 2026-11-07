import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Review Tray & Checkout | Janki Rasoi',
  description: 'Review your meal tray, choose your delivery address, and place your pure vegetarian order.',
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
