'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

const hotjarId = process.env.NEXT_PUBLIC_HOTJAR_ID;
const hotjarVersion = 6;
const blockedPrefixes = ['/admin', '/account'];

export function HotjarAnalytics() {
  const pathname = usePathname();
  const siteId = Number(hotjarId);

  if (!Number.isFinite(siteId) || siteId <= 0 || blockedPrefixes.some((prefix) => pathname?.startsWith(prefix))) {
    return null;
  }

  return (
    <Script id="hotjar" strategy="afterInteractive">
      {`
        (function(h,o,t,j,a,r){
          h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
          h._hjSettings={hjid:${siteId},hjsv:${hotjarVersion}};
          a=o.getElementsByTagName('head')[0];
          r=o.createElement('script');r.async=1;
          r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
          a.appendChild(r);
        })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
      `}
    </Script>
  );
}
