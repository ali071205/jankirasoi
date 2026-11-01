import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Today's Fresh Menu | Janki Rasoi",
  description: "Browse today's freshly prepared pure vegetarian North Indian thalis, parathas, and daily bowls in Sagore & Pithampur.",
};

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
