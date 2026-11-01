# Implementing Takshila analytics on the new site

For the developers building the new takshila.co. The event list itself is in
[NEW_SITE_EVENTS.md](NEW_SITE_EVENTS.md) (also published as a web page). This guide covers how to wire it up.

**The short version:** install the Amplitude SDK, copy the two generated files in `analytics/sdk/`, call `initAnalytics()` once, then call one typed function per user action. The functions come from the spec, so a misspelled event name or a missing property fails to compile.

---

## 1. Get the API keys

1. In Amplitude, go to **Settings → Projects → default (814554)** and copy the **API key**. This is the production key.
2. Create a second project, e.g. **Takshila (dev)**, and use its key for local, preview and staging builds. Test traffic then never mixes with real customer data.
3. Store them as environment variables, e.g. `NEXT_PUBLIC_AMPLITUDE_KEY` (browser) and `AMPLITUDE_KEY` (server). The browser key is public by design. Don't put the Amplitude *secret* key in the frontend.

## 2. Install the SDKs

```bash
npm install @amplitude/analytics-browser @amplitude/analytics-node
```

Copy `analytics/sdk/tracking.ts` (browser) and `analytics/sdk/server.ts` (backend) into the codebase, e.g. `src/lib/analytics/`.

Both files are **generated** from `analytics/new-site-events.json`. Don't edit them by hand. To change an event, edit the JSON and run:

```bash
python3 analytics/build_tracking_sdk.py
```

Then copy the regenerated files in again.

## 3. Initialise once

In the root layout or app entry point:

```ts
import { initAnalytics, setContext, pageView } from '@/lib/analytics/tracking';

initAnalytics(process.env.NEXT_PUBLIC_AMPLITUDE_KEY!, { debug: process.env.NODE_ENV !== 'production' });
```

On **every route change**, set the page context and send `page_view`. The context (`page_type`, `logged_in`) is added to every event automatically.

```ts
setContext({ page_type: 'product' });            // home | shop | product | design_studio | checkout | …
pageView({ page_path: location.pathname, page_title: document.title });
```

Amplitude's autocapture stays on (sessions, clicks, form interactions, session replay). The typed events add the business meaning on top.

## 4. Identify users

```ts
import { identifyUser, resetUser } from '@/lib/analytics/tracking';

// after sign-up or login — use your own user id, never the email
identifyUser(user.id, { user_role: 'buyer', signup_date: user.createdAt.slice(0, 10) });
signUp({ method: 'google', trigger_point: 'studio_save' });   // only on sign-up
login({ method: 'google' });                                   // only on login

// on logout
resetUser();
```

Calling `identifyUser` merges everything the visitor did while anonymous into their account.

## 5. Fire events where the action happens

Call the function in the handler that performs the action, after it succeeds. Each function's comment says exactly when it fires.

**Design Studio**

```ts
import * as track from '@/lib/analytics/tracking';

// studio page mounts
track.studioOpened({ studio_mode: 'buyer', entry_point: searchParams.get('from') ?? 'direct' });

// stepper moves to a new step (once per step per design)
track.studioStepViewed({ step: 'direct', step_number: 2, design_id });

// user clicks Generate / sends a chat message — before the AI answers
track.designPromptSubmitted({ design_id, prompt_length: prompt.length, has_reference_image: !!file, source: 'typed', location: 'studio' });

// directions finished rendering
track.designBatchGenerated({ design_id, batch_number, directions_count: 3, product_type_slug, latency_ms: Date.now() - startedAt });

// CHOOSE THIS DIRECTION
track.designDirectionChosen({ design_id, direction: 'signature', batch_number });

// FINALIZE MATERIALS, then each option change, then BUY NOW
track.designFinalizeStarted({ design_id, version_number, versions_created });
track.productOptionSelected({ context: 'studio_finalize', option_type: 'ring_size', option_value: '6', product_id: design_id, price_after: 2313 });
track.buyNowClicked({ context: 'studio_finalize', product_id: design_id, price: 2313, currency: 'USD', financing_shown: true });
```

**Shop and checkout**

```ts
track.productViewed({ product_id: 'pear-bypass-ring', product_name: 'Pear Bypass Ring', product_type_slug: 'ring', price: 620, currency: 'USD' });
track.cartItemAdded({ product_id: 'pear-bypass-ring', price: 620, currency: 'USD', quantity: 1, metal: '14k_yellow', size: '6' });
track.checkoutStarted({ source: 'cart', value: 620, currency: 'USD', item_count: 1, has_custom_design: false });
track.checkoutStepCompleted({ step: 'shipping_address', step_number: 2 });
track.paymentStarted({ value: 620, currency: 'USD', delivery_option: 'insured_standard', has_promo: false });
```

**`design_id` rule:** create it when the first prompt is submitted, and keep the same id on every studio event, in the cart, on the order and on the CAD. That's what lets us connect studio activity to revenue.

## 6. Server-side events

Send these three from the backend, never the browser, so ad blockers and closed tabs can't lose them:

```ts
import { initServerAnalytics, orderCompleted, updateCustomerTotals, paymentFailed, cadApproved, setInternal, flushAnalytics } from '@/lib/analytics/server';

initServerAnalytics(process.env.AMPLITUDE_KEY!);   // at server start-up

// payment provider webhook: payment succeeded
await orderCompleted({ user_id: order.userId, device_id: order.amplitudeDeviceId }, {
  order_id: order.id, revenue: order.total, currency: order.currency, item_count: order.items.length,
  has_custom_design: order.hasCustomDesign, coupon: order.coupon, payment_method: order.paymentMethod,
});
await updateCustomerTotals({ user_id: order.userId }, { orders_count, lifetime_revenue, country: order.shippingCountry });

// payment declined
await paymentFailed({ user_id: order.userId }, { order_id: order.id, reason: err.code, payment_method: 'card' });

// customer approves the CAD in My Activity (the API handler, not the button)
await cadApproved({ user_id }, { order_id, revision_number, hours_to_approve });

// on account creation
await setInternal({ user_id }, email.endsWith('@takshila.co'));

await flushAnalytics();   // at the end of serverless functions
```

- `order_completed` uses the order id as its insert id, so a webhook delivered twice is counted once.
- To join server events to the visitor's browser session, save Amplitude's device id with the order at checkout (`amplitude.getDeviceId()`) and pass it as `device_id`.

## 7. Privacy and consent

- **Never** send prompt text, emails, names, phone numbers or addresses as properties. The generated types only expose safe fields, e.g. `prompt_length` instead of the prompt.
- For visitors in the EU, UK and Switzerland, keep tracking off until they accept the cookie banner: call `amplitude.setOptOut(true)` before `initAnalytics`, then `amplitude.setOptOut(false)` when they consent. Have whoever handles legal confirm the banner wording.

## 8. Test before launch

1. Run the site with `debug: true` and the **dev** project key. Every event is logged in the browser console.
2. In Amplitude (dev project), open **User Lookup**, find your test user and watch the event stream live.
3. Walk through each P0 flow end to end and tick it off:
   - [ ] Studio: open → prompt → directions → choose → refine → finalize → buy now
   - [ ] Shop: product page → option change → add to cart → checkout → each step → payment
   - [ ] `order_completed` arrives once per order, from the server, with revenue
   - [ ] `cad_approved` and `cad_changes_requested` from My Activity
   - [ ] `design_id` is the same from prompt to order
   - [ ] Sign-up and login merge the anonymous history; logout resets
   - [ ] Staff accounts have `is_internal = true`
4. In **Data → Events**, anything marked *unexpected* is a name or property not in the plan: fix the code, not the plan.

## 9. At launch

1. In Amplitude, merge the **`new-site`** tracking-plan branch into main.
2. Mark the key events: `order_completed`, `checkout_started`, `design_prompt_submitted`, `design_direction_chosen`, `cad_approved`, `sign_up`, `newsletter_signed_up`.
3. Stop sending the deprecated events listed in the spec (`design_category_selected`, `design_product_type_selected`, `design_checkout_started`, `design_localized`, `design_tab_switched`, `community_rated`).
4. Switch the production build to the production API key.

## Changing an event later

1. Edit `analytics/new-site-events.json`.
2. Regenerate everything:
   ```bash
   python3 analytics/build_tracking_sdk.py && python3 analytics/build_spec.py && python3 analytics/build_spec_page.py
   ```
3. Update the event in Amplitude's tracking plan on a branch, and merge it when the code ships.
