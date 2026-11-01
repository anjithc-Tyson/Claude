# Takshila new site — Amplitude event spec

Based on the design at https://takshila.framer.website/. Generated from `new-site-events.json`: edit that file, then run `python3 analytics/build_spec.py`.
These events are also on the **`new-site`** branch of the Amplitude tracking plan (project 814554).

**Naming:** snake_case, object_action in the past tense (design_prompt_submitted). Properties snake_case. Prices are numbers in major units (620 not 62000) with a separate currency.

## Priorities

- **P0**: Must ship at launch: the revenue and design-studio funnel. Without these we cannot measure the business.
- **P1**: Ship at launch if possible: product discovery, community, account, order experience.
- **P2**: Nice to have: secondary interactions, seasonal campaigns, support content.

## Funnels these events power

- **Design Studio:** `studio_opened` → `design_prompt_submitted` → `design_batch_generated` → `design_direction_chosen` → `design_version_created` → `design_finalize_started` → `buy_now_clicked` (studio) → `checkout_started` → `payment_started` → `order_completed` → `cad_approved`
- **Shop:** `product_list_viewed` → `product_clicked` → `product_viewed` → `product_option_selected` → `cart_item_added` / `buy_now_clicked` → `checkout_started` → `checkout_step_completed` → `payment_started` → `order_completed`
- **Community → studio:** `community_feed_viewed` → `community_post_opened` → `community_design_customised` → `studio_opened` → …
- **Supply side:** `designer_cta_clicked` → `studio_opened` (designer mode) → `designer_design_published`

**Key events** (mark in Amplitude): `order_completed`, `checkout_started`, `design_prompt_submitted`, `design_direction_chosen`, `cad_approved`, `sign_up`, `newsletter_signed_up`.

## Summary

| Event | Area | Priority | Status |
|---|---|---|---|
| [`sign_up`](#sign_up) | Account | P0 | Already in the plan |
| [`cart_item_added`](#cart_item_added) | Checkout & Orders | P0 | New |
| [`buy_now_clicked`](#buy_now_clicked) | Checkout & Orders | P0 | New |
| [`checkout_started`](#checkout_started) | Checkout & Orders | P0 | New |
| [`checkout_step_completed`](#checkout_step_completed) | Checkout & Orders | P0 | New |
| [`payment_started`](#payment_started) | Checkout & Orders | P0 | New |
| [`order_completed`](#order_completed) | Checkout & Orders | P0 | Already in the plan |
| [`payment_failed`](#payment_failed) | Checkout & Orders | P0 | New |
| [`community_design_customised`](#community_design_customised) | Community | P0 | New |
| [`studio_opened`](#studio_opened) | Design Studio | P0 | New |
| [`studio_step_viewed`](#studio_step_viewed) | Design Studio | P0 | New |
| [`design_prompt_submitted`](#design_prompt_submitted) | Design Studio | P0 | Already in the plan |
| [`design_batch_generated`](#design_batch_generated) | Design Studio | P0 | Keep (already live) |
| [`design_generation_failed`](#design_generation_failed) | Design Studio | P0 | New |
| [`design_direction_chosen`](#design_direction_chosen) | Design Studio | P0 | New |
| [`design_version_created`](#design_version_created) | Design Studio | P0 | New |
| [`design_finalize_started`](#design_finalize_started) | Design Studio | P0 | New |
| [`cad_review_opened`](#cad_review_opened) | My Activity | P0 | New |
| [`cad_approved`](#cad_approved) | My Activity | P0 | New |
| [`cad_changes_requested`](#cad_changes_requested) | My Activity | P0 | New |
| [`page_view`](#page_view) | Navigation | P0 | Keep (already live) |
| [`product_clicked`](#product_clicked) | Shop | P0 | New |
| [`product_viewed`](#product_viewed) | Shop | P0 | New |
| [`product_option_selected`](#product_option_selected) | Shop | P0 | New |
| [`referral_link_shared`](#referral_link_shared) | Account | P1 | New |
| [`login`](#login) | Account | P1 | New |
| [`newsletter_signed_up`](#newsletter_signed_up) | Account | P1 | Already in the plan |
| [`cart_viewed`](#cart_viewed) | Checkout & Orders | P1 | New |
| [`cart_item_removed`](#cart_item_removed) | Checkout & Orders | P1 | New |
| [`delivery_option_selected`](#delivery_option_selected) | Checkout & Orders | P1 | New |
| [`promo_code_applied`](#promo_code_applied) | Checkout & Orders | P1 | New |
| [`design_posted_to_community`](#design_posted_to_community) | Community | P1 | Keep (already live) |
| [`community_feed_viewed`](#community_feed_viewed) | Community | P1 | New |
| [`community_post_opened`](#community_post_opened) | Community | P1 | New |
| [`community_like_toggled`](#community_like_toggled) | Community | P1 | Keep (already live) |
| [`community_post_created`](#community_post_created) | Community | P1 | New |
| [`upload_design_clicked`](#upload_design_clicked) | Design Studio | P1 | New |
| [`prompt_suggestion_clicked`](#prompt_suggestion_clicked) | Design Studio | P1 | New |
| [`design_reference_uploaded`](#design_reference_uploaded) | Design Studio | P1 | New |
| [`design_brief_understood`](#design_brief_understood) | Design Studio | P1 | New |
| [`design_directions_regenerated`](#design_directions_regenerated) | Design Studio | P1 | New |
| [`studio_exited`](#studio_exited) | Design Studio | P1 | New |
| [`activity_tab_viewed`](#activity_tab_viewed) | My Activity | P1 | New |
| [`order_tracking_expanded`](#order_tracking_expanded) | My Activity | P1 | Keep (already live) |
| [`message_sent`](#message_sent) | My Activity | P1 | New |
| [`order_payment_retry_clicked`](#order_payment_retry_clicked) | My Activity | P1 | Keep (already live) |
| [`nav_clicked`](#nav_clicked) | Navigation | P1 | New |
| [`cta_clicked`](#cta_clicked) | Navigation | P1 | New |
| [`search_submitted`](#search_submitted) | Navigation | P1 | New |
| [`product_list_viewed`](#product_list_viewed) | Shop | P1 | New |
| [`product_list_filtered`](#product_list_filtered) | Shop | P1 | New |
| [`price_breakdown_viewed`](#price_breakdown_viewed) | Shop | P1 | New |
| [`size_guide_opened`](#size_guide_opened) | Shop | P1 | New |
| [`wishlist_item_added`](#wishlist_item_added) | Shop | P1 | New |
| [`designer_cta_clicked`](#designer_cta_clicked) | Supply | P1 | New |
| [`designer_design_published`](#designer_design_published) | Supply | P1 | New |
| [`contact_form_submitted`](#contact_form_submitted) | Support | P1 | New |
| [`profile_viewed`](#profile_viewed) | Account | P2 | New |
| [`profile_tab_viewed`](#profile_tab_viewed) | Account | P2 | New |
| [`profile_edit_saved`](#profile_edit_saved) | Account | P2 | Keep (already live) |
| [`profile_share_clicked`](#profile_share_clicked) | Account | P2 | Keep (already live) |
| [`gift_options_set`](#gift_options_set) | Checkout & Orders | P2 | New |
| [`progress_updates_opted_in`](#progress_updates_opted_in) | Checkout & Orders | P2 | New |
| [`community_filter_applied`](#community_filter_applied) | Community | P2 | Keep (already live) |
| [`user_followed`](#user_followed) | Community | P2 | New |
| [`design_version_restored`](#design_version_restored) | Design Studio | P2 | New |
| [`design_named`](#design_named) | Design Studio | P2 | New |
| [`saved_designs_opened`](#saved_designs_opened) | Design Studio | P2 | New |
| [`campaign_interacted`](#campaign_interacted) | Marketing | P2 | New |
| [`order_stage_details_viewed`](#order_stage_details_viewed) | My Activity | P2 | Keep (already live) |
| [`order_document_downloaded`](#order_document_downloaded) | My Activity | P2 | New |
| [`activity_design_edited`](#activity_design_edited) | My Activity | P2 | Keep (already live) |
| [`activity_design_removed`](#activity_design_removed) | My Activity | P2 | Keep (already live) |
| [`activity_community_status_toggled`](#activity_community_status_toggled) | My Activity | P2 | Keep (already live) |
| [`search_opened`](#search_opened) | Navigation | P2 | New |
| [`product_info_opened`](#product_info_opened) | Shop | P2 | New |
| [`delivery_estimate_checked`](#delivery_estimate_checked) | Shop | P2 | New |
| [`size_guide_method_selected`](#size_guide_method_selected) | Shop | P2 | New |
| [`wishlist_item_removed`](#wishlist_item_removed) | Shop | P2 | New |
| [`content_shared`](#content_shared) | Shop | P2 | New |
| [`faq_opened`](#faq_opened) | Support | P2 | New |
| [`process_stage_viewed`](#process_stage_viewed) | Support | P2 | New |

82 events: 24 P0, 33 P1, 25 P2.

## User properties

Set with `identify()`.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `user_role` | string |  | Primary role on the platform. Set on sign-up and when it changes. A user can hold several; send the primary one. One of: `buyer`, `designer`, `maker`, `affiliate`, `collector` |
| `is_internal` | boolean |  | True for Takshila staff, designers testing and QA accounts. Lets every chart exclude internal traffic. |
| `signup_date` | string |  | ISO date the account was created. |
| `orders_count` | number |  | Lifetime completed orders. Update server-side on order_completed. |
| `lifetime_revenue` | number |  | Lifetime order revenue in USD. Update server-side on order_completed. |
| `country` | string |  | Shipping country of the most recent order, or browser country before that. |
| `marketing_opt_in` | boolean |  | Subscribed to the newsletter or marketing email. |

## Properties on every event

| Property | Type | Req. | Notes |
|---|---|---|---|
| `page_type` | string |  | Template of the page the event happened on. Send on every event. One of: `home`, `shop`, `product`, `design_studio`, `designer_studio`, `my_activity`, `community`, `profile`, `how_it_works`, `checkout`, `size_guide`, `contact`, `legal` |
| `logged_in` | boolean |  | Whether the user is signed in. Send on every event. |

## Navigation

### `page_view`

**P0** · Keep (already live) · All pages

**Fires when:** Every page load and client-side route change.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `page_path` | string | ✓ | e.g. /shop/pear-bypass-ring |
| `page_title` | string |  |  |
| `referrer` | string |  |  |
| `utm_source` | string |  |  |
| `utm_medium` | string |  |  |
| `utm_campaign` | string |  |  |

### `nav_clicked`

**P1** · New · Header, footer, mobile menu

**Fires when:** A link in the header nav (SHOP, DESIGN STUDIO, MY ACTIVITY, COMMUNITY, HOW TAKSHILA WORKS) or the footer is clicked.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `item` | string | ✓ | Link label, e.g. design_studio, size_guide |
| `location` | string | ✓ | One of: `header`, `footer`, `mobile_menu` |

### `cta_clicked`

**P1** · New · All marketing pages

**Fires when:** A primary button that is not covered by a more specific event is clicked (START DESIGNING, OPEN DESIGN STUDIO, BROWSE THE SHOP, START YOUR PIECE, EXPLORE COMMUNITY DESIGNS, DESIGN SOMETHING NEW…).

| Property | Type | Req. | Notes |
|---|---|---|---|
| `cta_text` | string | ✓ |  |
| `section` | string | ✓ | Section the button sits in, e.g. hero, gift_edit, blank_canvas_banner |
| `destination` | string |  | Target path |

### `search_opened`

**P2** · New · Header

**Fires when:** The search icon is clicked.

_No event-specific properties._

### `search_submitted`

**P1** · New · Header search

**Fires when:** A search is run.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `search_term` | string | ✓ |  |
| `results_count` | number |  |  |

## Design Studio

### `upload_design_clicked`

**P1** · New · Header

**Fires when:** UPLOAD DESIGN in the header is clicked.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `location` | string | ✓ | One of: `header`, `profile`, `how_it_works` |

### `prompt_suggestion_clicked`

**P1** · New · Home, Design Studio, Designer Studio

**Fires when:** A suggested prompt chip is clicked ("Initial pendant in rose gold", "Oval ring for my mother", "Spider-web pendant"…).

| Property | Type | Req. | Notes |
|---|---|---|---|
| `suggestion` | string | ✓ | Chip text |
| `location` | string | ✓ | One of: `home_hero`, `home_halloween`, `studio_empty_state`, `designer_studio` |

### `studio_opened`

**P0** · New · /design-studio, /designer-studio

**Fires when:** The Design Studio (or Designer Studio) loads.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `studio_mode` | string | ✓ | One of: `buyer`, `designer` |
| `entry_point` | string |  | Where they came from: header_nav, home_hero, prompt_chip, community_customise, product_customize, shop_banner, direct |
| `is_returning_design` | boolean |  | Opened an existing saved design rather than a new one |

### `studio_step_viewed`

**P0** · New · /design-studio

**Fires when:** The studio advances to a step in the Describe → Direct → Refine → Finalize → Buy stepper. Fire once per step per design.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `step` | string | ✓ | One of: `describe`, `direct`, `refine`, `finalize`, `buy` |
| `step_number` | number | ✓ | 1–5 |
| `design_id` | string |  |  |

### `design_prompt_submitted`

**P0** · Already in the plan · Home hero, /design-studio

**Fires when:** The user clicks Generate, or sends a chat message in the studio. Fire on submit, before the AI responds.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `design_id` | string | ✓ |  |
| `prompt_length` | number | ✓ | Character count. Do not send the prompt text. |
| `has_reference_image` | boolean | ✓ |  |
| `message_index` | number |  | 1 for the first brief, 2+ for follow-up chat messages |
| `source` | string |  | One of: `typed`, `suggestion` |
| `location` | string |  | One of: `home_hero`, `studio` |

### `design_reference_uploaded`

**P1** · New · Home hero, /design-studio

**Fires when:** A sketch or photo is attached via "Add a sketch or photo" / UPLOAD.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `file_type` | string |  | One of: `image`, `pdf`, `other` |
| `location` | string |  | One of: `home_hero`, `studio` |

### `design_brief_understood`

**P1** · New · /design-studio

**Fires when:** The AI replies "I have everything I need to start" and shows the brief tags (Ring · Oval diamond · Yellow gold · Hidden halo).

| Property | Type | Req. | Notes |
|---|---|---|---|
| `design_id` | string | ✓ |  |
| `product_type_slug` | string |  | ring, earrings, pendant… |
| `metal` | string |  |  |
| `stone` | string |  |  |
| `clarifying_questions` | number |  | How many follow-up questions the AI asked before understanding |

### `design_batch_generated`

**P0** · Keep (already live) · /design-studio

**Fires when:** A set of design directions (Timeless / Modern / Signature) finishes rendering.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `design_id` | string | ✓ |  |
| `batch_number` | number | ✓ | 1 for the first set, 2+ after SHOW 3 NEW DIRECTIONS |
| `directions_count` | number |  |  |
| `product_type_slug` | string |  |  |
| `latency_ms` | number |  | Time from prompt submit to render |

### `design_generation_failed`

**P0** · New · /design-studio

**Fires when:** Generation errors or times out.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `design_id` | string |  |  |
| `error_type` | string |  | One of: `timeout`, `safety_filter`, `server_error`, `unsupported_request` |

### `design_directions_regenerated`

**P1** · New · /design-studio

**Fires when:** SHOW 3 NEW DIRECTIONS or a modifier chip (Simpler, Bolder, More vintage, More classic, Something else…) is clicked.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `design_id` | string | ✓ |  |
| `modifier` | string | ✓ | One of: `none`, `simpler`, `bolder`, `more_vintage`, `more_classic`, `something_else` |

### `design_direction_chosen`

**P0** · New · /design-studio

**Fires when:** CHOOSE THIS DIRECTION is clicked.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `design_id` | string | ✓ |  |
| `direction` | string | ✓ | One of: `timeless`, `modern`, `signature` |
| `batch_number` | number |  |  |

### `design_version_created`

**P0** · New · /design-studio

**Fires when:** A new version (v2, v3…) is generated from a change the user asked for in Refine.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `design_id` | string | ✓ |  |
| `version_number` | number | ✓ |  |
| `change_area` | string |  | If the AI can classify the request One of: `band`, `stone`, `setting`, `size`, `other` |

### `design_version_restored`

**P2** · New · /design-studio

**Fires when:** The user taps an earlier version to go back to it.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `design_id` | string | ✓ |  |
| `version_number` | number | ✓ |  |

### `design_named`

**P2** · New · /design-studio

**Fires when:** NAME IT is confirmed.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `design_id` | string | ✓ |  |
| `name_source` | string | ✓ | One of: `suggested`, `custom` |

### `design_finalize_started`

**P0** · New · /design-studio

**Fires when:** FINALIZE MATERIALS is clicked.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `design_id` | string | ✓ |  |
| `version_number` | number | ✓ |  |
| `versions_created` | number |  | Total versions before finalizing |

### `saved_designs_opened`

**P2** · New · /design-studio sidebar

**Fires when:** The saved-designs drawer is expanded, or a saved design is opened from it.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `action` | string |  | One of: `expanded`, `design_opened`, `new_design` |

### `studio_exited`

**P1** · New · /design-studio

**Fires when:** The studio exit (X) is clicked. Shows where people abandon.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `step` | string | ✓ | One of: `describe`, `direct`, `refine`, `finalize`, `buy` |
| `design_id` | string |  |  |
| `versions_created` | number |  |  |

## Community

### `design_posted_to_community`

**P1** · Keep (already live) · /design-studio, /my-activity

**Fires when:** A design is shared to the Community feed.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `design_id` | string | ✓ |  |
| `product_type_slug` | string |  |  |

### `community_feed_viewed`

**P1** · New · /community

**Fires when:** The feed loads or a feed tab is switched.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `feed` | string | ✓ | One of: `for_you`, `following`, `latest` |

### `community_filter_applied`

**P2** · Keep (already live) · /community

**Fires when:** A category (Rings, Earrings…) or content filter (Designed in the studio, Behind the bench, Worn by you) is chosen.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `filter_type` | string | ✓ | One of: `category`, `content_type` |
| `filter_value` | string | ✓ |  |

### `community_post_opened`

**P1** · New · /community, profiles

**Fires when:** A post is opened.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `post_id` | string | ✓ |  |
| `post_type` | string |  | One of: `studio_design`, `behind_the_bench`, `worn_by_you`, `product` |
| `author_role` | string |  |  |
| `position` | number |  |  |

### `community_like_toggled`

**P1** · Keep (already live) · /community, profiles

**Fires when:** A post is liked or unliked.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `post_id` | string | ✓ |  |
| `liked` | boolean | ✓ |  |

### `community_design_customised`

**P0** · New · /community

**Fires when:** CUSTOMISE is clicked on a community post: the community-to-studio handoff.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `post_id` | string | ✓ |  |
| `product_type_slug` | string |  |  |

### `community_post_created`

**P1** · New · /community, /profile

**Fires when:** SHARE YOUR WORK / Share something is published.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `post_type` | string | ✓ | One of: `studio_design`, `behind_the_bench`, `worn_by_you` |
| `has_image` | boolean |  |  |

### `user_followed`

**P2** · New · Profiles, community

**Fires when:** FOLLOW is clicked (fire unfollow with following=false).

| Property | Type | Req. | Notes |
|---|---|---|---|
| `target_user_role` | string |  |  |
| `following` | boolean | ✓ |  |

## Shop

### `product_list_viewed`

**P1** · New · Home, /shop, product pages

**Fires when:** A product grid or rail scrolls into view (once per list per page view).

| Property | Type | Req. | Notes |
|---|---|---|---|
| `list_name` | string | ✓ | shop_all, shop_by_category, halloween_picks, gift_edit, first_fine_jewelry, engagement, you_might_also_like, made_for_you |
| `category` | string |  |  |
| `product_count` | number |  |  |

### `product_list_filtered`

**P1** · New · /shop, home tabs

**Fires when:** A category tile, filter or tab (For Her / For Him, SOLITAIRE / TOI ET MOI) changes the product list.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `filter_type` | string | ✓ | One of: `category`, `recipient`, `style`, `price` |
| `filter_value` | string | ✓ |  |
| `list_name` | string |  |  |

### `product_clicked`

**P0** · New · Any product card

**Fires when:** A product card (image, name or CUSTOMIZE) is clicked.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `product_id` | string | ✓ | Slug, e.g. pear-bypass-ring |
| `product_name` | string | ✓ |  |
| `price` | number | ✓ |  |
| `list_name` | string | ✓ |  |
| `position` | number |  | 0-based position in the list |
| `click_target` | string |  | One of: `card`, `customize_button` |

### `product_viewed`

**P0** · New · /shop/{product}

**Fires when:** A product page loads.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `product_id` | string | ✓ |  |
| `product_name` | string | ✓ |  |
| `product_type_slug` | string | ✓ | ring, necklace, earrings, bracelet, pendant, cufflinks, wedding_band, set |
| `price` | number | ✓ | Starting price as shown |
| `currency` | string | ✓ |  |
| `designer_id` | string |  | Designer credited on the page, if any |

### `product_option_selected`

**P0** · New · Product pages, studio Finalize step

**Fires when:** A configurable option changes: metal, karat, gold colour, ring size, length, centre stone, carat, shape, quality, side stones.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `context` | string | ✓ | One of: `product_page`, `studio_finalize` |
| `option_type` | string | ✓ | One of: `metal`, `karat`, `metal_color`, `ring_size`, `length`, `centre_stone`, `carat`, `shape`, `quality`, `side_stones` |
| `option_value` | string | ✓ |  |
| `product_id` | string |  | Product slug, or design_id in the studio |
| `price_after` | number |  | Price shown after the change |

### `price_breakdown_viewed`

**P1** · New · Product pages, studio Finalize

**Fires when:** View price breakdown / Price breakdown is opened. The site's transparency promise ("Every dollar, on the receipt").

| Property | Type | Req. | Notes |
|---|---|---|---|
| `context` | string | ✓ | One of: `product_page`, `studio_finalize`, `checkout` |
| `product_id` | string |  |  |
| `price` | number |  |  |

### `product_info_opened`

**P2** · New · Product pages

**Fires when:** PRODUCT JOURNEY, RETURN POLICY, "See how big they look", "See where each length sits" or similar info panels are opened.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `panel` | string | ✓ | One of: `product_journey`, `return_policy`, `size_visualiser`, `length_guide`, `stone_info` |
| `product_id` | string |  |  |

### `delivery_estimate_checked`

**P2** · New · Product pages

**Fires when:** A ZIP code is entered and Check is clicked.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `product_id` | string |  |  |
| `estimate_days` | number |  |  |
| `country` | string |  |  |

### `size_guide_opened`

**P1** · New · Product pages, studio, /size-guide

**Fires when:** Find your ring size / Find your bracelet length / Size guide is opened.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `context` | string | ✓ | One of: `product_page`, `studio_finalize`, `footer`, `direct` |
| `product_type_slug` | string |  |  |

### `size_guide_method_selected`

**P2** · New · /size-guide

**Fires when:** A sizing path is chosen.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `method` | string | ✓ | One of: `know_my_size`, `measure_ring`, `measure_finger`, `gift`, `all_sizes` |
| `product_type_slug` | string |  |  |

### `wishlist_item_added`

**P1** · New · Product cards, product pages

**Fires when:** Save to wishlist / heart is turned on.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `product_id` | string | ✓ |  |
| `price` | number |  |  |
| `context` | string |  | One of: `product_page`, `product_card`, `community` |

### `wishlist_item_removed`

**P2** · New · Product cards, product pages, My Activity › Wishlist

**Fires when:** A saved item is un-saved.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `product_id` | string | ✓ |  |

### `content_shared`

**P2** · New · Product pages, community, profile

**Fires when:** Share is clicked on a product, community post or design.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `content_type` | string | ✓ | One of: `product`, `community_post`, `design` |
| `content_id` | string | ✓ |  |
| `channel` | string |  | copy_link, whatsapp, pinterest, instagram, native_share |

## Checkout & Orders

### `cart_item_added`

**P0** · New · Product pages, studio

**Fires when:** Add to cart or Add set is clicked.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `product_id` | string | ✓ |  |
| `product_name` | string |  |  |
| `price` | number | ✓ |  |
| `currency` | string | ✓ |  |
| `quantity` | number |  |  |
| `is_set` | boolean |  |  |
| `metal` | string |  |  |
| `size` | string |  |  |
| `centre_stone` | string |  |  |

### `buy_now_clicked`

**P0** · New · Product pages, studio Finalize

**Fires when:** BUY NOW is clicked.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `context` | string | ✓ | One of: `product_page`, `studio_finalize` |
| `product_id` | string |  | Product slug, or design_id in the studio |
| `price` | number | ✓ |  |
| `currency` | string | ✓ |  |
| `financing_shown` | boolean |  | Whether the monthly-payment option was displayed |

### `cart_viewed`

**P1** · New · Header bag

**Fires when:** The bag opens.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `item_count` | number |  |  |
| `cart_value` | number |  |  |

### `cart_item_removed`

**P1** · New · Bag, checkout

**Fires when:** Remove is clicked, or quantity goes to 0.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `product_id` | string | ✓ |  |
| `price` | number |  |  |

### `checkout_started`

**P0** · New · /checkout

**Fires when:** The checkout page loads with at least one item. Replaces design_checkout_started, which only covered the studio.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `source` | string | ✓ | One of: `cart`, `buy_now_product`, `buy_now_studio` |
| `value` | number | ✓ |  |
| `currency` | string | ✓ |  |
| `item_count` | number | ✓ |  |
| `has_custom_design` | boolean |  | Cart contains a studio-designed piece |

### `checkout_step_completed`

**P0** · New · /checkout

**Fires when:** A checkout section is completed and validated.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `step` | string | ✓ | One of: `contact`, `shipping_address`, `delivery`, `gifting` |
| `step_number` | number | ✓ |  |

### `delivery_option_selected`

**P1** · New · /checkout

**Fires when:** A delivery option is chosen.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `option` | string | ✓ | One of: `insured_standard`, `express_insured` |
| `cost` | number |  |  |

### `promo_code_applied`

**P1** · New · /checkout

**Fires when:** APPLY is clicked on a gift card or promo code (fire for success and failure).

| Property | Type | Req. | Notes |
|---|---|---|---|
| `code` | string | ✓ | Campaign codes only (e.g. SPELL13). Hash or omit unique gift-card numbers. |
| `code_type` | string |  | One of: `promo`, `gift_card` |
| `success` | boolean | ✓ |  |
| `discount_value` | number |  |  |

### `gift_options_set`

**P2** · New · /checkout › Gifting

**Fires when:** Gifting is turned on or the gift note is saved.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `gift_wrap` | boolean |  |  |
| `has_note` | boolean |  |  |

### `progress_updates_opted_in`

**P2** · New · /checkout › Contact

**Fires when:** "Text and email me progress photos" is ticked.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `opted_in` | boolean | ✓ |  |

### `payment_started`

**P0** · New · /checkout

**Fires when:** CONTINUE TO PAYMENT is clicked.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `value` | number | ✓ |  |
| `currency` | string | ✓ |  |
| `delivery_option` | string |  |  |
| `has_promo` | boolean |  |  |

### `order_completed`

**P0** · Already in the plan · Server (payment webhook)

**Fires when:** Payment succeeds. Send from the server once per order, with revenue, so Amplitude revenue charts work.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `order_id` | string | ✓ |  |
| `revenue` | number | ✓ |  |
| `currency` | string | ✓ |  |
| `item_count` | number |  |  |
| `product_type_slug` | string |  |  |
| `has_custom_design` | boolean |  |  |
| `coupon` | string |  |  |
| `delivery_option` | string |  |  |
| `payment_method` | string |  | card, paypal, apple_pay, klarna, financing |

### `payment_failed`

**P0** · New · Server / payment page

**Fires when:** A payment attempt is declined or errors.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `order_id` | string |  |  |
| `reason` | string |  |  |
| `payment_method` | string |  |  |

## My Activity

### `activity_tab_viewed`

**P1** · New · /my-activity

**Fires when:** A My Activity tab is opened.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `tab` | string | ✓ | One of: `messages`, `orders`, `earnings`, `referrals`, `wishlist`, `designs` |

### `order_tracking_expanded`

**P1** · Keep (already live) · /my-activity › Orders

**Fires when:** An order card is expanded.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `order_id` | string | ✓ |  |
| `current_step` | number |  | Step N of 7 |

### `order_stage_details_viewed`

**P2** · Keep (already live) · /my-activity › Orders

**Fires when:** A production stage (Idea, Design, CAD, Gemstone, Crafting, Certified, Delivered) is opened.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `order_id` | string | ✓ |  |
| `stage` | string | ✓ |  |

### `cad_review_opened`

**P0** · New · /my-activity

**Fires when:** REVIEW CAD is clicked on an order that needs approval.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `order_id` | string | ✓ |  |
| `revision_number` | number |  |  |

### `cad_approved`

**P0** · New · /my-activity

**Fires when:** The customer approves the CAD (production can start).

| Property | Type | Req. | Notes |
|---|---|---|---|
| `order_id` | string | ✓ |  |
| `revision_number` | number | ✓ |  |
| `hours_to_approve` | number |  | Hours since the CAD was sent |

### `cad_changes_requested`

**P0** · New · /my-activity

**Fires when:** The customer asks for changes to the CAD.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `order_id` | string | ✓ |  |
| `revision_number` | number | ✓ |  |

### `message_sent`

**P1** · New · /my-activity

**Fires when:** A message is sent via Message the studio / MESSAGE ABOUT THIS ORDER.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `thread_type` | string | ✓ | One of: `studio`, `order`, `designer` |
| `order_id` | string |  |  |

### `order_document_downloaded`

**P2** · New · /my-activity

**Fires when:** An invoice or certificate is downloaded.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `order_id` | string | ✓ |  |
| `document_type` | string | ✓ | One of: `invoice`, `certificate` |

### `order_payment_retry_clicked`

**P1** · Keep (already live) · /my-activity

**Fires when:** A failed payment is retried.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `order_id` | string | ✓ |  |

### `activity_design_edited`

**P2** · Keep (already live) · /my-activity

**Fires when:** A saved design is reopened for editing.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `design_id` | string | ✓ |  |

### `activity_design_removed`

**P2** · Keep (already live) · /my-activity

**Fires when:** A saved design is deleted.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `design_id` | string | ✓ |  |

### `activity_community_status_toggled`

**P2** · Keep (already live) · /my-activity

**Fires when:** A saved design is made public or private.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `design_id` | string | ✓ |  |
| `is_public` | boolean | ✓ |  |

## Account

### `profile_viewed`

**P2** · New · /profile

**Fires when:** A profile page loads.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `is_own_profile` | boolean | ✓ |  |
| `profile_role` | string |  | designer, maker, collector, affiliate |

### `profile_tab_viewed`

**P2** · New · /profile

**Fires when:** Feed / Salon / Store / About tab is opened.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `tab` | string | ✓ | One of: `feed`, `salon`, `store`, `about` |
| `is_own_profile` | boolean |  |  |

### `profile_edit_saved`

**P2** · Keep (already live) · /profile

**Fires when:** Profile edits are saved.

_No event-specific properties._

### `profile_share_clicked`

**P2** · Keep (already live) · /profile

**Fires when:** SHARE / Share profile is clicked.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `is_own_profile` | boolean |  |  |

### `referral_link_shared`

**P1** · New · /profile, /my-activity › Referrals

**Fires when:** SHARE AND EARN / a referral link is copied or shared.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `channel` | string |  |  |
| `location` | string |  | One of: `profile`, `my_activity` |

### `sign_up`

**P0** · Already in the plan · Sign-up flow

**Fires when:** An account is created. Call setUserId at the same moment.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `method` | string | ✓ | One of: `email`, `google`, `apple` |
| `trigger_point` | string |  | What prompted it: studio_save, checkout, community_like, header |

### `login`

**P1** · New · Login

**Fires when:** A user signs in.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `method` | string | ✓ | One of: `email`, `google`, `apple` |

### `newsletter_signed_up`

**P1** · Already in the plan · Footer "Takshila in your mailbox" on every page

**Fires when:** Subscribe succeeds with a valid email. Never send the email.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `source` | string | ✓ | footer, popup, checkout |

## Supply

### `designer_cta_clicked`

**P1** · New · /how-takshila-works, /profile, /design-studio

**Fires when:** A supply-side CTA is clicked: OPEN DESIGNER STUDIO, SELL YOUR DESIGNS, APPLY AS A MAKER, MAKE WITH US, "Designing to earn?".

| Property | Type | Req. | Notes |
|---|---|---|---|
| `cta` | string | ✓ | One of: `open_designer_studio`, `sell_your_designs`, `apply_as_maker`, `make_with_us` |
| `location` | string | ✓ |  |

### `designer_design_published`

**P1** · New · /designer-studio

**Fires when:** A designer publishes a design for sale.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `design_id` | string | ✓ |  |
| `product_type_slug` | string |  |  |
| `price` | number |  |  |

## Support

### `contact_form_submitted`

**P1** · New · /contact

**Fires when:** SEND MESSAGE succeeds.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `topic` | string | ✓ | Value of the topic dropdown |
| `has_order_number` | boolean |  |  |

### `faq_opened`

**P2** · New · /contact

**Fires when:** A FAQ question is expanded.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `question` | string | ✓ |  |

### `process_stage_viewed`

**P2** · New · Home, /how-takshila-works

**Fires when:** A stage in the 01 Idea → 07 Delivered explainer is clicked.

| Property | Type | Req. | Notes |
|---|---|---|---|
| `stage` | string | ✓ | One of: `idea`, `design`, `cad`, `gemstone`, `crafting`, `certified`, `delivered` |

## Marketing

### `campaign_interacted`

**P2** · New · Home seasonal sections

**Fires when:** An interactive seasonal element is used (Halloween lights switch, Pick a pumpkin).

| Property | Type | Req. | Notes |
|---|---|---|---|
| `campaign` | string | ✓ | e.g. halloween_2026 |
| `action` | string | ✓ | e.g. lights_toggled, pumpkin_picked |

## Deprecated on the new site

Stop sending these when the new site launches.

| Event | Why |
|---|---|
| `design_category_selected` | The new studio is prompt-first; there is no category picker. The product type now comes from design_brief_understood.product_type_slug. |
| `design_product_type_selected` | Same as above. |
| `design_checkout_started` | Replaced by checkout_started with source = buy_now_studio, which also covers shop purchases. |
| `design_localized` | Replaced by design_version_created (each requested change creates a new version). |
| `design_tab_switched` | The new studio uses a step flow; replaced by studio_step_viewed. |
| `community_rated` | The new design has likes, no ratings. |

## Implementation notes

- Call `amplitude.setUserId()` on sign-up and login, and `reset()` on logout, so anonymous browsing merges into the account.
- Send `order_completed`, `payment_failed`, `cad_approved` and the `orders_count` / `lifetime_revenue` user properties from the **server**. Ad blockers and closed tabs will otherwise lose revenue.
- Never send prompt text, email addresses, names, phone numbers or street addresses as properties.
- Set `is_internal = true` on every staff and test account from day one, so dashboards can exclude internal traffic.
- `design_id` must be stable from the first prompt through checkout and order, so the studio funnel can be joined to revenue.
- Keep Amplitude autocapture (page views, clicks, session replay) on. These events add the business meaning on top.
