import { Helmet } from 'react-helmet-async';

import { DesktopShell } from '@/components/desktop/desktop-shell';

import { getSiteUrl } from '@/lib/site';

export function HomePage() {
  const siteUrl = getSiteUrl();
  const title = 'postjuice';
  const description =
    '데스크톱 메타포 개인 사이트 — 아이콘을 더블클릭하면 창이 열립니다.';

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`${siteUrl}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`${siteUrl}/`} />
        <meta name="twitter:card" content="summary" />
      </Helmet>

      <DesktopShell />
    </>
  );
}
