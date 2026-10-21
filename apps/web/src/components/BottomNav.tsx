'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  // Don't show customer bottom nav on rider portal
  if (pathname.startsWith('/rider')) return null;

  const links = [
    { href: '/', label: 'Home', icon: 'home' },
    { href: '/menu', label: 'Daily Menu', icon: 'restaurant_menu' },
    { href: '/cart', label: 'My Tray', icon: 'shopping_cart' },
    { href: '/track', label: 'Track Order', icon: 'local_shipping' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 py-2">
      <div className="max-w-md mx-auto grid grid-cols-4 text-center">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-0.5 transition-colors ${
                isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{link.icon}</span>
              <span className="text-[10px]">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
