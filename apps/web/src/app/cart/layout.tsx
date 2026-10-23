import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Review Tray & Checkout | Janki Rasoi',
  description: 'Review your meal tray, choose your lunch or dinner delivery window, and place your pure vegetarian tiffin order.',
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
