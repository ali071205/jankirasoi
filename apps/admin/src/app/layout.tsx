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
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="https://fonts.gstatic.com/s/materialsymbolsoutlined/v382/kJEhBvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oFsI.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if ('fonts' in document && !document.fonts.check('24px "Material Symbols Outlined"')) {
                    document.documentElement.classList.add('icons-loading');
                    document.fonts.load('24px "Material Symbols Outlined"').then(function() {
                      document.documentElement.classList.remove('icons-loading');
                    }).catch(function() {
                      document.documentElement.classList.remove('icons-loading');
                    });
                    setTimeout(function() {
                      document.documentElement.classList.remove('icons-loading');
                    }, 1200);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-surface font-body text-on-surface min-h-screen flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
