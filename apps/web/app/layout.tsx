import type { Metadata } from 'next';
import { FloatingAccess } from '../components/floating-access';
import { HotjarAnalytics } from '../components/hotjar-analytics';
import { getLocaleDirection } from '../lib/locale';
import { getRequestLocale } from '../lib/server-locale';
import './globals.css';

export const metadata: Metadata = {
  title: '3S Design',
  description: 'Premium creative marketplace for digital design assets.',
  icons: {
    icon: '/icon.svg',
  },
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getRequestLocale();
  const direction = getLocaleDirection(locale);

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('3s-design-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}",
          }}
        />
        {children}
        <HotjarAnalytics />
        <FloatingAccess locale={locale} />
      </body>
    </html>
  );
}
