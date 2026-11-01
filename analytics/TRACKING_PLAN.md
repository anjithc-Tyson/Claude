# Takshila — GA4 tracking plan

Implementation: [`takshila-analytics.js`](takshila-analytics.js), wired into both pages in `showcase/`.
It sends GA4 events through `gtag.js`. Until a Measurement ID is set in
`<meta name="ga-measurement-id">`, it runs in debug mode: events are logged to the console and
`window.dataLayer`, and nothing is sent to Google.

## The funnel we're measuring

```
Visit ─▶ Browse (section_view, view_item_list) ─▶ Intent (design_start, select_item, add_to_wishlist)
      ─▶ Key event (design_generate, newsletter_signup) ─▶ Revenue (purchase — production site, not yet tagged)
```

## Key events (mark these in GA Admin → Events → "Mark as key event")

| Event | Why it matters |
|---|---|
| `design_generate` | Someone asked the AI Design Studio for a design. This is the core product action. |
| `newsletter_signup` | Captures a lead you can remarket to. |
| `design_upload_click` | Shows high intent: they already have a sketch or photo. |

## Event catalog

| Event | Fires when | Parameters |
|---|---|---|
| `view_promotion` | Page load with the announcement bar | `promotion_id`, `promotion_name`, `creative_slot` |
| `section_view` | A section is 40% in view (once per page) | `section` |
| `view_item_list` | A product grid comes into view, or a tab switches its contents | `item_list_id`, `item_list_name`, `items[]` |
| `select_item` | Product card clicked | `item_list_name`, `items[]` (name, price, variant, category, badge) |
| `add_to_wishlist` | Heart on a product card clicked | `currency`, `value`, `items[]` |
| `category_select` | "Shop by category" tile clicked | `category`, `index` |
| `carousel_scroll` | Category rail arrows | `direction` |
| `design_start` | Any CTA that leads to the Design Studio (hero, Halloween, floating CREATE) | `location`, `cta_text` |
| `design_prompt_suggestion` | A "Try:" prompt chip clicked | `prompt`, `section` |
| `design_generate` | **Generate** button in the studio prompt | `location` |
| `design_upload_click` | "Upload design" (header) or "Add a sketch or photo" | `location` |
| `studio_engaged` | Visitor spent 10s or more on the Design Studio section | `seconds` |
| `tab_select` | Gift Edit / Engagement tabs | `tab_group`, `tab` |
| `halloween_lights_toggle` | Halloween lights switch | `lights_off` |
| `halloween_pumpkin_pick` | Trick-or-treat pumpkin | `pumpkin` |
| `nav_click` | Header navigation | `link_text`, `link_url` |
| `view_cart`, `search_open`, `account_click`, `menu_open` | Header icons | `location` |
| `cta_click` | Any other button or link styled as a CTA | `cta_text`, `section`, `link_url` |
| `social_click` | Footer social icons | `network` |
| `footer_click` | Footer links | `link_text` |
| `newsletter_signup` | Footer form submitted with a valid email (the email is **never** sent) | `location`, `method` |

Every event also carries `page_type` (`home`, `how_it_works`), which is also sent as the GA4 `content_group`.
GA4 enhanced measurement adds page views, scroll depth, outbound clicks and engagement time automatically.

## Custom definitions to register (GA Admin → Custom definitions)

Event parameters only show up in GA reports after you register them.

- **Event-scoped dimensions:** `page_type`, `section`, `location`, `cta_text`, `tab_group`, `tab`,
  `prompt`, `category`, `network`, `link_text`, `direction`, `lights_off`, `pumpkin`
- **Custom metric:** `seconds` (unit: seconds)

## Not tracked yet (needs the production site)

The showcase pages are mockups, so these events don't exist yet. The production site should send:

| Event | Where |
|---|---|
| `design_submitted` / `design_approved` | Studio backend, through the Measurement Protocol when a jeweler approves the CAD |
| `add_to_cart`, `begin_checkout`, `add_payment_info`, `purchase` | Product page, cart and checkout (GA4 ecommerce schema with `transaction_id`, `value`, `coupon`, e.g. `SPELL13`) |
| `sign_up`, `login` | Account flows |
| `search` | Search results, with `search_term` |

## Consent

Ad storage is off everywhere. Analytics storage is **denied by default in the EEA, UK and Switzerland**,
following Consent Mode v2. Takshila ships to the EU and UK, so a consent banner should call
`gtag('consent', 'update', { analytics_storage: 'granted' })`. Until then, GA4 models those visits rather than recording them.
Have whoever owns legal review this default.

## The numbers I'll track

Once the Analytics connection has credentials, these reports come from the GA4 Data API:

| Metric | Definition |
|---|---|
| Studio conversion rate | sessions with `design_generate` ÷ sessions |
| Studio funnel | `section_view(studio)` → `design_start` → `design_prompt_suggestion` / `design_upload_click` → `design_generate` |
| Prompt chip uptake | `design_prompt_suggestion` by `prompt` |
| Product interest | `view_item_list` → `select_item` click-through rate by `item_list_name`; `add_to_wishlist` by item |
| Category demand | `category_select` by `category` |
| Gift Edit audience | `tab_select` by `tab` |
| Halloween campaign | `view_promotion` (SPELL13) reach, engagement with the Halloween section, `design_start` from `location=halloween` |
| Lead capture | `newsletter_signup` ÷ users |
| Scroll health | `section_view` drop-off by `section`, showing where people stop scrolling |
| Acquisition | all of the above split by `sessionDefaultChannelGroup` and `deviceCategory` |

## Launch checklist

1. Create a GA4 web data stream and paste its `G-…` ID into `<meta name="ga-measurement-id">`.
2. Open a page with `?ga_debug=1` and check events in GA Admin → DebugView.
3. Mark the three key events and register the custom definitions above.
4. Give the analytics MCP read access: set `GOOGLE_APPLICATION_CREDENTIALS` and `GOOGLE_CLOUD_PROJECT` (see `.mcp.json`).
