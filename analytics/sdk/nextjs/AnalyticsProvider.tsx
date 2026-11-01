'use client';

/**
 * Next.js App Router integration for Takshila analytics.
 *
 * Put <AnalyticsProvider pageType={...}> in app/layout.tsx around {children}.
 * It starts Amplitude once in the browser and sends page_view on every route change.
 * Amplitude only runs in the browser, so call the track.* functions from client
 * components ('use client') or event handlers, never from server components.
 */
import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initAnalytics, setContext, pageView, type PageType } from './tracking';

/** Maps a URL path to the spec's page_type. Adjust when routes change. */
export function pageTypeFor(path: string): PageType {
  if (path === '/') return 'home';
  if (path.startsWith('/shop/')) return 'product';
  if (path.startsWith('/shop')) return 'shop';
  if (path.startsWith('/design-studio')) return 'design_studio';
  if (path.startsWith('/designer-studio')) return 'designer_studio';
  if (path.startsWith('/my-activity')) return 'my_activity';
  if (path.startsWith('/community')) return 'community';
  if (path.startsWith('/profile')) return 'profile';
  if (path.startsWith('/how-takshila-works')) return 'how_it_works';
  if (path.startsWith('/checkout')) return 'checkout';
  if (path.startsWith('/size-guide')) return 'size_guide';
  if (path.startsWith('/contact')) return 'contact';
  return 'legal';
}

function RouteTracker({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const last = useRef<string | null>(null);

  useEffect(() => {
    const url = pathname + (search.size ? `?${search}` : '');
    if (last.current === url) return; // React strict mode runs effects twice in dev
    last.current = url;
    setContext({ page_type: pageTypeFor(pathname), logged_in: loggedIn });
    pageView({
      page_path: pathname,
      page_title: document.title,
      referrer: document.referrer || undefined,
      utm_source: search.get('utm_source') ?? undefined,
      utm_medium: search.get('utm_medium') ?? undefined,
      utm_campaign: search.get('utm_campaign') ?? undefined,
    });
  }, [pathname, search, loggedIn]);

  return null;
}

let started = false;

export function AnalyticsProvider({ children, loggedIn = false }: { children: React.ReactNode; loggedIn?: boolean }) {
  if (typeof window !== 'undefined' && !started) {
    started = true;
    initAnalytics(process.env.NEXT_PUBLIC_AMPLITUDE_KEY ?? '', { debug: process.env.NODE_ENV !== 'production' });
  }
  return (
    <>
      {/* useSearchParams needs a Suspense boundary in the App Router */}
      <Suspense fallback={null}>
        <RouteTracker loggedIn={loggedIn} />
      </Suspense>
      {children}
    </>
  );
}
