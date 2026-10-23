import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Kitchen Tracking | Janki Rasoi',
  description: 'Track your wholesome meal preparation in real-time from kitchen tawa to doorstep delivery with live status updates.',
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
