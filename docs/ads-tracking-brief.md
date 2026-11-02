# Takshila: Ads Tracking Brief for the Tech Team

**Goal:** Meta and Google Ads must see every purchase on takshila.co (with order value) so campaigns can optimise for **sales**.

| Item | Value |
|---|---|
| Site | https://takshila.co (Next.js) |
| Meta Pixel / Dataset ID | `1628258889097316` |
| Google Analytics 4 | `G-X1767HQFGR` (already installed) |
| Currency | `USD` |

## Tasks (in priority order)

1. [ ] **DNS:** add Meta domain verification TXT record
2. [ ] **Meta Pixel:** base code on every page
3. [ ] **Meta events:** `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`
4. [ ] **GA4 events:** `purchase` (plus `view_item`, `add_to_cart`, `begin_checkout` if easy)
5. [ ] **Meta Conversions API:** send `Purchase` from the server too (recommended)
6. [ ] **Test** with a real order and share screenshots

---

## 1. DNS TXT record (Meta domain verification)

Get the code from **Meta Business Settings → Brand safety and suitability → Domains → takshila.co**.

| Type | Host / Name | Value |
|---|---|---|
| TXT | `@` | `facebook-domain-verification=XXXXXXXX` |

Tell marketing once it's added. They click **Verify** in Meta.

---

## 2. Meta Pixel base code

Load once, site-wide (e.g. App Router `app/layout.tsx`, or Pages Router `pages/_app.tsx`).

```tsx
// components/MetaPixel.tsx
'use client';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export const META_PIXEL_ID = '1628258889097316';

export default function MetaPixel() {
  const pathname = usePathname();

  // Fires PageView on first load and on every client-side route change
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'PageView');
    }
  }, [pathname]);

  return (
    <Script id="meta-pixel" strategy="afterInteractive">{`
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${META_PIXEL_ID}');
    `}</Script>
  );
}
```

Add `<MetaPixel />` inside `<body>` in the root layout. (The `useEffect` fires the first `PageView` on mount, so don't add a second `fbq('track','PageView')` in the snippet.)

If the site has a cookie-consent banner, only load the Pixel after consent where required.

---

## 3. Meta standard events

Helper:

```ts
// lib/track.ts
export function fbq(...args: any[]) {
  if (typeof window !== 'undefined' && (window as any).fbq) (window as any).fbq(...args);
}
export function gtag(...args: any[]) {
  if (typeof window !== 'undefined' && (window as any).gtag) (window as any).gtag(...args);
}
```

| When | Meta event | Code |
|---|---|---|
| Product page viewed | `ViewContent` | `fbq('track','ViewContent',{content_ids:[product.id],content_type:'product',content_name:product.name,value:product.price,currency:'USD'})` |
| Add to cart clicked | `AddToCart` | `fbq('track','AddToCart',{content_ids:[product.id],content_type:'product',value:product.price,currency:'USD'})` |
| Checkout started | `InitiateCheckout` | `fbq('track','InitiateCheckout',{content_ids:cartIds,num_items:cart.length,value:cart.total,currency:'USD'})` |
| **Order confirmed** | **`Purchase`** | see below |

**Purchase** (order confirmation page, fire **once per order**):

```ts
fbq('track', 'Purchase', {
  value: order.total,            // number, e.g. 249.00 (product total; excl. shipping/tax is fine, just be consistent)
  currency: 'USD',
  content_ids: order.items.map(i => i.productId),
  content_type: 'product',
  num_items: order.items.length,
}, { eventID: `order_${order.id}` }); // same ID is used by the Conversions API for de-duplication
```

Guard against double-firing on page refresh (e.g. a `sessionStorage` flag keyed on the order ID).

**Custom / co-created orders:** if a piece is designed in the Design Studio and paid later, fire `Purchase` when the **payment** succeeds, with the paid amount.

---

## 4. Google Analytics 4 events

GA4 (`G-X1767HQFGR`) is already on the site. Add the ecommerce events; **`purchase` is required**.

```ts
gtag('event', 'purchase', {
  transaction_id: order.id,      // required, prevents duplicates
  value: order.total,
  currency: 'USD',
  items: order.items.map(i => ({
    item_id: i.productId,
    item_name: i.name,
    item_category: i.category,   // e.g. 'Jewelry'
    price: i.price,
    quantity: i.quantity,
  })),
});
```

Nice to have: `view_item`, `add_to_cart`, `begin_checkout` with the same `items` shape.

Marketing will then mark `purchase` as a key event and import it into Google Ads.

---

## 5. Meta Conversions API (server-side Purchase) — recommended

Recovers purchases lost to ad blockers / iOS privacy. Send from the server when the order is paid (e.g. payment webhook).

1. Marketing generates an **access token**: Events Manager → Takshila Pixel → Settings → Conversions API → *Generate access token*.
2. Store it as a server secret, e.g. `META_CAPI_TOKEN`. **Never commit it or expose it to the browser.**

```ts
// server only
import crypto from 'crypto';
const sha256 = (v: string) => crypto.createHash('sha256').update(v.trim().toLowerCase()).digest('hex');

export async function sendMetaPurchase(order: Order, req: { ip: string; userAgent: string; fbp?: string; fbc?: string }) {
  const body = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: `order_${order.id}`,           // MUST match the browser eventID
      action_source: 'website',
      event_source_url: `https://takshila.co/order/${order.id}`,
      user_data: {
        em: [sha256(order.email)],
        ph: order.phone ? [sha256(order.phone.replace(/\D/g, ''))] : undefined,
        client_ip_address: req.ip,
        client_user_agent: req.userAgent,
        fbp: req.fbp,                           // from the _fbp cookie
        fbc: req.fbc,                           // from the _fbc cookie
      },
      custom_data: {
        currency: 'USD',
        value: order.total,
        content_ids: order.items.map(i => i.productId),
        content_type: 'product',
      },
    }],
  };
  await fetch(`https://graph.facebook.com/v23.0/1628258889097316/events?access_token=${process.env.META_CAPI_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
```

Use the latest Graph API version available at implementation time. Save `fbp`/`fbc` cookies on the order at checkout so the webhook can send them.

---

## 6. Testing checklist

- [ ] **Meta Pixel Helper** (Chrome extension) shows the Pixel on every page, with no errors
- [ ] **Meta Events Manager → Takshila Pixel → Test events:** place a test order and see `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase` with the correct `value` and `currency`
- [ ] If CAPI is done: `Purchase` shows **Browser and Server**, de-duplicated
- [ ] **GA4 → Admin → DebugView** (or Realtime): `purchase` arrives with `transaction_id` and `value`
- [ ] Refreshing the confirmation page does **not** send a second purchase
- [ ] Send screenshots to marketing
