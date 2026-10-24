import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f8faf7] flex flex-col items-center justify-center p-4 text-center">
      <h2 className="text-2xl font-bold font-headline text-stone-900 mb-2">Page Not Found</h2>
      <p className="text-sm text-stone-500 mb-6">The requested console page does not exist.</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-xl bg-emerald-800 text-white font-bold text-xs shadow-xs hover:bg-emerald-900 transition-colors"
      >
        Return to Operations Console
      </Link>
    </div>
  );
}
