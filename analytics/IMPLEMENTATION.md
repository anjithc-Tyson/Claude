# Implementing Takshila analytics: Next.js + Laravel

For the developers building the new takshila.co (Next.js / React frontend, Laravel API backend).
The event list itself is in [NEW_SITE_EVENTS.md](NEW_SITE_EVENTS.md), also published as a web page.

**The short version:**
- **Frontend:** install the Amplitude browser SDK, copy the generated `tracking.ts` and the two Next.js files, wrap the layout in `<AnalyticsProvider>`, and call one typed function per user action.
- **Backend:** copy the Laravel files, set two `.env` keys, and call `ServerEvents` from the payment webhook and the CAD approval handler. Events go out on a queue, so they never slow down a request.

Everything in `analytics/sdk/` is generated from `analytics/new-site-events.json` or written to match it. A misspelled event name or a missing required property fails to compile (TypeScript) or throws (PHP).

```
analytics/sdk/
├── tracking.ts                 generated: one typed function per browser event
├── nextjs/
│   ├── AnalyticsProvider.tsx   starts Amplitude, sends page_view on every route change
│   └── api.ts                  sends the Amplitude device id to Laravel on every API call
├── laravel/
│   ├── config/amplitude.php
│   ├── app/Analytics/Actor.php
│   ├── app/Analytics/Amplitude.php
│   ├── app/Analytics/ServerEvents.php        generated: order_completed, payment_failed, cad_approved
│   ├── app/Jobs/SendToAmplitude.php          queued, retries rate limits and outages
│   ├── app/Http/Middleware/CaptureAmplitudeDevice.php
│   ├── app/Listeners/MarkInternalUser.php    flags staff accounts is_internal
│   └── tests/Feature/AmplitudeTest.php
└── server.ts                   Node version of the server events (not needed with Laravel)
```

---

## 1. Get the API keys

1. In Amplitude, go to **Settings → Projects → default (814554)** and copy the **API key**. This is production.
2. Create a second project, **Takshila (dev)**, and use its key for local, preview and staging. Test traffic then never mixes with customer data.
3. The same project key goes in both apps. It is safe in the browser by design. Never put Amplitude's *secret* key in the frontend.

```bash
# Next.js .env.local
NEXT_PUBLIC_AMPLITUDE_KEY=...
NEXT_PUBLIC_API_URL=https://api.takshila.co
```

```bash
# Laravel .env
AMPLITUDE_API_KEY=...
AMPLITUDE_QUEUE=analytics
# EU data residency only: AMPLITUDE_ENDPOINT=https://api.eu.amplitude.com
```

---

## Frontend (Next.js)

### 2. Install and copy

```bash
npm install @amplitude/analytics-browser
```

Copy `analytics/sdk/tracking.ts`, `analytics/sdk/nextjs/AnalyticsProvider.tsx` and `analytics/sdk/nextjs/api.ts` into one folder, e.g. `src/lib/analytics/`.

### 3. Wrap the root layout

```tsx
// app/layout.tsx (a server component; AnalyticsProvider is a client component)
import { AnalyticsProvider } from '@/lib/analytics/AnalyticsProvider';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = /* from your Sanctum session */ false;
  return (
    <html lang="en">
      <body>
        <AnalyticsProvider loggedIn={loggedIn}>{children}</AnalyticsProvider>
      </body>
    </html>
  );
}
```

This starts Amplitude once and sends `page_view` with the right `page_type` on every route change. If you add routes, update `pageTypeFor()` in `AnalyticsProvider.tsx`.

**Client vs. server components:** Amplitude runs in the browser. Call `track.*` only in client components (`'use client'`) or event handlers, never in server components or route handlers.

### 4. Call the Laravel API through `apiFetch`

```ts
import { apiFetch } from '@/lib/analytics/api';

await apiFetch('/api/checkout', { method: 'POST', body: JSON.stringify(cart) });
```

It adds the `X-Amplitude-Device-Id` header, which lets Laravel tie server events to the same visitor. Using axios? Add the interceptor shown at the bottom of `api.ts`.

### 5. Identify users

```ts
import { identifyUser, resetUser, signUp, login } from '@/lib/analytics/tracking';

// after Sanctum login / registration succeeds. Use your user id, never the email.
identifyUser(String(user.id), { user_role: 'buyer', signup_date: user.created_at.slice(0, 10) });
signUp({ method: 'google', trigger_point: 'studio_save' });  // registration only
login({ method: 'google' });                                  // login only

// on logout
resetUser();
```

This merges everything the visitor did while anonymous into their account.

### 6. Fire events where the action happens

Call the function in the handler, after the action succeeds. Each function's comment says exactly when it fires. With Redux Toolkit, a thunk's `fulfilled` branch is a good place.

```ts
import * as track from '@/lib/analytics/tracking';

// Design Studio
track.studioOpened({ studio_mode: 'buyer', entry_point: searchParams.get('from') ?? 'direct' });
track.studioStepViewed({ step: 'direct', step_number: 2, design_id });
track.designPromptSubmitted({ design_id, prompt_length: prompt.length, has_reference_image: !!file, source: 'typed', location: 'studio' });
track.designBatchGenerated({ design_id, batch_number, directions_count: 3, product_type_slug, latency_ms: Date.now() - startedAt });
track.designDirectionChosen({ design_id, direction: 'signature', batch_number });
track.designFinalizeStarted({ design_id, version_number, versions_created });
track.productOptionSelected({ context: 'studio_finalize', option_type: 'ring_size', option_value: '6', product_id: design_id, price_after: 2313 });
track.buyNowClicked({ context: 'studio_finalize', product_id: design_id, price: 2313, currency: 'USD', financing_shown: true });

// Shop and checkout
track.productViewed({ product_id: 'pear-bypass-ring', product_name: 'Pear Bypass Ring', product_type_slug: 'ring', price: 620, currency: 'USD' });
track.cartItemAdded({ product_id: 'pear-bypass-ring', price: 620, currency: 'USD', quantity: 1, metal: '14k_yellow', size: '6' });
track.checkoutStarted({ source: 'cart', value: 620, currency: 'USD', item_count: 1, has_custom_design: false });
track.checkoutStepCompleted({ step: 'shipping_address', step_number: 2 });
track.paymentStarted({ value: 620, currency: 'USD', delivery_option: 'insured_standard', has_promo: false });
```

**`design_id` rule:** create it (or have Laravel return it) when the first prompt is submitted, store it on the design, cart line and order, and send the same id on every event. That's what connects studio activity to revenue.

---

## Backend (Laravel)

### 7. Copy the files and register them

Copy everything under `analytics/sdk/laravel/` into the Laravel project at the same paths (`config/`, `app/`, `tests/`). Then register the middleware on the API group:

```php
// bootstrap/app.php
->withMiddleware(function (Middleware $middleware) {
    $middleware->appendToGroup('api', \App\Http\Middleware\CaptureAmplitudeDevice::class);
})
```

`MarkInternalUser` is discovered automatically (Laravel 11+) and flags staff accounts on registration: `@takshila.co` emails, or Spatie roles `admin`, `staff` or `qa` (configurable in `config/amplitude.php`).

### 8. Run a queue worker for analytics

Events are sent by `SendToAmplitude` jobs on the `analytics` queue, so a slow or failing Amplitude never blocks a checkout or webhook. Add the queue to your worker. With PM2 on the VPS:

```bash
pm2 start "php artisan queue:work --queue=default,analytics --tries=5" --name laravel-queue
```

The job retries rate limits and outages (10 s, 1 min, 5 min, 15 min). If Amplitude rejects an event as invalid, it logs `Amplitude rejected event` with the reason in `storage/logs` (or CloudWatch) and doesn't retry.

### 9. Send the server-side events

Send these three from Laravel, never the browser, so ad blockers and closed tabs can't lose them.

```php
use App\Analytics\Actor;
use App\Analytics\ServerEvents;

// At checkout (a request from the Next.js app): remember the device id on the order
$order->amplitude_device_id = $request->header('X-Amplitude-Device-Id');

// Payment provider webhook: payment succeeded (no browser here, so use the stored device id)
public function paymentSucceeded(Order $order, ServerEvents $events)
{
    $actor = Actor::user($order->user_id, $order->amplitude_device_id);

    $events->orderCompleted($actor,
        orderId: $order->number,
        revenue: $order->total,
        currency: $order->currency,
        itemCount: $order->items()->count(),
        hasCustomDesign: $order->has_custom_design,
        coupon: $order->coupon_code,
        deliveryOption: $order->delivery_option,
        paymentMethod: $order->payment_method,
    );

    $user = $order->user;
    $events->updateCustomerTotals($actor,
        ordersCount: $user->orders()->paid()->count(),
        lifetimeRevenue: $user->orders()->paid()->sum('total'),
        country: $order->shipping_country,
    );
}

// Payment declined
$events->paymentFailed(Actor::user($order->user_id, $order->amplitude_device_id),
    orderId: $order->number, reason: $exception->getCode(), paymentMethod: 'card');

// CAD approval endpoint (the API handler, not the button)
$events->cadApproved(Actor::fromRequest($request),
    orderId: $order->number,
    revisionNumber: $cad->revision,
    hoursToApprove: $cad->sent_at->diffInHours(now()),
);
```

- `order_completed` uses the order number as its insert id, so a webhook delivered twice is counted once.
- Add an `amplitude_device_id` (nullable string) column to `orders` with a migration.
- For events that aren't in the spec yet, use `app(\App\Analytics\Amplitude::class)->track('event_name', $actor, [...])`, and add the event to the spec.

### 10. Run the tests

```bash
php artisan test --filter=AmplitudeTest
```

They check the payload sent to Amplitude (revenue, insert id, user and device ids), queueing, retries, invalid-payload handling and the staff flag, without calling Amplitude. Add them to CI.

---

## 11. Privacy and consent

- **Never** send prompt text, emails, names, phone numbers or addresses as properties. The generated functions only accept safe fields, e.g. `prompt_length` instead of the prompt.
- For EU, UK and Swiss visitors, keep tracking off until they accept the cookie banner: call `amplitude.setOptOut(true)` before the provider starts, then `amplitude.setOptOut(false)` on consent. Have whoever handles legal confirm the banner wording.

## 12. Test before launch

1. Run both apps with the **dev** project key. The browser console logs every event in development.
2. In Amplitude (dev project), open **User Lookup**, find your test user and watch the event stream live.
3. Walk each P0 flow end to end:
   - [ ] Studio: open → prompt → directions → choose → refine → finalize → buy now
   - [ ] Shop: product page → option change → add to cart → checkout → each step → payment
   - [ ] `order_completed` arrives once per order, from Laravel, with revenue and the same device id as the browser events
   - [ ] `cad_approved` and `cad_changes_requested` from My Activity
   - [ ] `design_id` is the same from prompt to order
   - [ ] Sign-up and login merge the anonymous history; logout resets
   - [ ] Staff accounts show `is_internal = true`
4. In **Data → Events**, anything marked *unexpected* is a name or property not in the plan: fix the code, not the plan.

## 13. At launch

1. In Amplitude, merge the **`new-site`** tracking-plan branch into main.
2. Mark the key events: `order_completed`, `checkout_started`, `design_prompt_submitted`, `design_direction_chosen`, `cad_approved`, `sign_up`, `newsletter_signed_up`.
3. Stop sending the deprecated events listed in the spec.
4. Switch both apps to the production key.

## Changing an event later

1. Edit `analytics/new-site-events.json`.
2. Regenerate:
   ```bash
   python3 analytics/build_tracking_sdk.py && python3 analytics/build_spec.py && python3 analytics/build_spec_page.py
   ```
3. Copy the regenerated `tracking.ts` and `ServerEvents.php` into the apps.
4. Update the event in Amplitude's tracking plan on a branch, and merge it when the code ships.
