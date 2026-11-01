// GENERATED FILE. Do not edit by hand.
// Source: analytics/new-site-events.json  ·  Regenerate: python3 analytics/build_tracking_sdk.py
// Spec: Takshila new site — Amplitude event spec (82 events)

import * as amplitude from '@amplitude/analytics-browser';

/* ------------------------------------------------------------------ */
/* Setup                                                              */
/* ------------------------------------------------------------------ */

export type PageType = "home" | "shop" | "product" | "design_studio" | "designer_studio" | "my_activity" | "community" | "profile" | "how_it_works" | "checkout" | "size_guide" | "contact" | "legal";

/** Sent on every event by the enrichment plugin below. Update it with setContext(). */
const context: { page_type: PageType; logged_in: boolean } = { page_type: 'home', logged_in: false };

/**
 * Call once, as early as possible on every page (e.g. in the root layout).
 * Autocapture keeps Amplitude's automatic page views, clicks, form events and web vitals.
 */
export function initAnalytics(apiKey: string, opts: { debug?: boolean } = {}) {
  amplitude.add({
    name: 'takshila-context',
    type: 'enrichment',
    execute: async (event) => {
      event.event_properties = { ...context, ...(event.event_properties ?? {}) };
      return event;
    },
  });
  amplitude.init(apiKey, {
    autocapture: { pageViews: false, sessions: true, formInteractions: true, fileDownloads: true, elementInteractions: true },
    logLevel: opts.debug ? amplitude.Types.LogLevel.Debug : amplitude.Types.LogLevel.Warn,
  });
}

/** Call on every route change, before firing page_view. */
export function setContext(next: Partial<typeof context>) {
  Object.assign(context, next);
}

export type UserProperties = {
  /** Primary role on the platform. Set on sign-up and when it changes. A user can hold several; send the primary one. */
  user_role?: "buyer" | "designer" | "maker" | "affiliate" | "collector";
  /** True for Takshila staff, designers testing and QA accounts. Lets every chart exclude internal traffic. */
  is_internal?: boolean;
  /** ISO date the account was created. */
  signup_date?: string;
  /** Lifetime completed orders. Update server-side on order_completed. */
  orders_count?: number;
  /** Lifetime order revenue in USD. Update server-side on order_completed. */
  lifetime_revenue?: number;
  /** Shipping country of the most recent order, or browser country before that. */
  country?: string;
  /** Subscribed to the newsletter or marketing email. */
  marketing_opt_in?: boolean;
};

/** Call on sign-up and on login, with your own user id (never the email). */
export function identifyUser(userId: string, props: Partial<UserProperties> = {}) {
  amplitude.setUserId(userId);
  const id = new amplitude.Identify();
  for (const [k, v] of Object.entries(props)) if (v !== undefined) id.set(k, v as string | number | boolean);
  amplitude.identify(id);
  setContext({ logged_in: true });
}

/** Call on logout so the next person on this device is a new anonymous user. */
export function resetUser() {
  amplitude.reset();
  setContext({ logged_in: false });
}

/* ------------------------------------------------------------------ */
/* Events: one typed function per event in the spec                    */
/* ------------------------------------------------------------------ */

export type PageViewProps = {
  /** e.g. /shop/pear-bypass-ring */
  page_path: string;
  page_title?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};
/**
 * **P0** · Navigation · All pages
 * Fires when: Every page load and client-side route change.
 * Already sent by the current site: keep the same name.
 */
export const pageView = (props: PageViewProps) => amplitude.track('page_view', props);

export type NavClickedProps = {
  /** Link label, e.g. design_studio, size_guide */
  item: string;
  location: "header" | "footer" | "mobile_menu";
};
/**
 * **P1** · Navigation · Header, footer, mobile menu
 * Fires when: A link in the header nav (SHOP, DESIGN STUDIO, MY ACTIVITY, COMMUNITY, HOW TAKSHILA WORKS) or the footer is clicked.
 */
export const navClicked = (props: NavClickedProps) => amplitude.track('nav_clicked', props);

export type CtaClickedProps = {
  cta_text: string;
  /** Section the button sits in, e.g. hero, gift_edit, blank_canvas_banner */
  section: string;
  /** Target path */
  destination?: string;
};
/**
 * **P1** · Navigation · All marketing pages
 * Fires when: A primary button that is not covered by a more specific event is clicked (START DESIGNING, OPEN DESIGN STUDIO, BROWSE THE SHOP, START YOUR PIECE, EXPLORE COMMUNITY DESIGNS, DESIGN SOMETHING NEW…).
 */
export const ctaClicked = (props: CtaClickedProps) => amplitude.track('cta_clicked', props);

/**
 * **P2** · Navigation · Header
 * Fires when: The search icon is clicked.
 */
export const searchOpened = () => amplitude.track('search_opened');

export type SearchSubmittedProps = {
  search_term: string;
  results_count?: number;
};
/**
 * **P1** · Navigation · Header search
 * Fires when: A search is run.
 */
export const searchSubmitted = (props: SearchSubmittedProps) => amplitude.track('search_submitted', props);

export type UploadDesignClickedProps = {
  location: "header" | "profile" | "how_it_works";
};
/**
 * **P1** · Design Studio · Header
 * Fires when: UPLOAD DESIGN in the header is clicked.
 */
export const uploadDesignClicked = (props: UploadDesignClickedProps) => amplitude.track('upload_design_clicked', props);

export type PromptSuggestionClickedProps = {
  /** Chip text */
  suggestion: string;
  location: "home_hero" | "home_halloween" | "studio_empty_state" | "designer_studio";
};
/**
 * **P1** · Design Studio · Home, Design Studio, Designer Studio
 * Fires when: A suggested prompt chip is clicked ("Initial pendant in rose gold", "Oval ring for my mother", "Spider-web pendant"…).
 */
export const promptSuggestionClicked = (props: PromptSuggestionClickedProps) => amplitude.track('prompt_suggestion_clicked', props);

export type StudioOpenedProps = {
  studio_mode: "buyer" | "designer";
  /** Where they came from: header_nav, home_hero, prompt_chip, community_customise, product_customize, shop_banner, direct */
  entry_point?: string;
  /** Opened an existing saved design rather than a new one */
  is_returning_design?: boolean;
};
/**
 * **P0** · Design Studio · /design-studio, /designer-studio
 * Fires when: The Design Studio (or Designer Studio) loads.
 */
export const studioOpened = (props: StudioOpenedProps) => amplitude.track('studio_opened', props);

export type StudioStepViewedProps = {
  step: "describe" | "direct" | "refine" | "finalize" | "buy";
  /** 1–5 */
  step_number: number;
  design_id?: string;
};
/**
 * **P0** · Design Studio · /design-studio
 * Fires when: The studio advances to a step in the Describe → Direct → Refine → Finalize → Buy stepper. Fire once per step per design.
 */
export const studioStepViewed = (props: StudioStepViewedProps) => amplitude.track('studio_step_viewed', props);

export type DesignPromptSubmittedProps = {
  design_id: string;
  /** Character count. Do not send the prompt text. */
  prompt_length: number;
  has_reference_image: boolean;
  /** 1 for the first brief, 2+ for follow-up chat messages */
  message_index?: number;
  source?: "typed" | "suggestion";
  location?: "home_hero" | "studio";
};
/**
 * **P0** · Design Studio · Home hero, /design-studio
 * Fires when: The user clicks Generate, or sends a chat message in the studio. Fire on submit, before the AI responds.
 */
export const designPromptSubmitted = (props: DesignPromptSubmittedProps) => amplitude.track('design_prompt_submitted', props);

export type DesignReferenceUploadedProps = {
  file_type?: "image" | "pdf" | "other";
  location?: "home_hero" | "studio";
};
/**
 * **P1** · Design Studio · Home hero, /design-studio
 * Fires when: A sketch or photo is attached via "Add a sketch or photo" / UPLOAD.
 */
export const designReferenceUploaded = (props: DesignReferenceUploadedProps = {}) => amplitude.track('design_reference_uploaded', props);

export type DesignBriefUnderstoodProps = {
  design_id: string;
  /** ring, earrings, pendant… */
  product_type_slug?: string;
  metal?: string;
  stone?: string;
  /** How many follow-up questions the AI asked before understanding */
  clarifying_questions?: number;
};
/**
 * **P1** · Design Studio · /design-studio
 * Fires when: The AI replies "I have everything I need to start" and shows the brief tags (Ring · Oval diamond · Yellow gold · Hidden halo).
 */
export const designBriefUnderstood = (props: DesignBriefUnderstoodProps) => amplitude.track('design_brief_understood', props);

export type DesignBatchGeneratedProps = {
  design_id: string;
  /** 1 for the first set, 2+ after SHOW 3 NEW DIRECTIONS */
  batch_number: number;
  directions_count?: number;
  product_type_slug?: string;
  /** Time from prompt submit to render */
  latency_ms?: number;
};
/**
 * **P0** · Design Studio · /design-studio
 * Fires when: A set of design directions (Timeless / Modern / Signature) finishes rendering.
 * Already sent by the current site: keep the same name.
 */
export const designBatchGenerated = (props: DesignBatchGeneratedProps) => amplitude.track('design_batch_generated', props);

export type DesignGenerationFailedProps = {
  design_id?: string;
  error_type?: "timeout" | "safety_filter" | "server_error" | "unsupported_request";
};
/**
 * **P0** · Design Studio · /design-studio
 * Fires when: Generation errors or times out.
 */
export const designGenerationFailed = (props: DesignGenerationFailedProps = {}) => amplitude.track('design_generation_failed', props);

export type DesignDirectionsRegeneratedProps = {
  design_id: string;
  modifier: "none" | "simpler" | "bolder" | "more_vintage" | "more_classic" | "something_else";
};
/**
 * **P1** · Design Studio · /design-studio
 * Fires when: SHOW 3 NEW DIRECTIONS or a modifier chip (Simpler, Bolder, More vintage, More classic, Something else…) is clicked.
 */
export const designDirectionsRegenerated = (props: DesignDirectionsRegeneratedProps) => amplitude.track('design_directions_regenerated', props);

export type DesignDirectionChosenProps = {
  design_id: string;
  direction: "timeless" | "modern" | "signature";
  batch_number?: number;
};
/**
 * **P0** · Design Studio · /design-studio
 * Fires when: CHOOSE THIS DIRECTION is clicked.
 */
export const designDirectionChosen = (props: DesignDirectionChosenProps) => amplitude.track('design_direction_chosen', props);

export type DesignVersionCreatedProps = {
  design_id: string;
  version_number: number;
  /** If the AI can classify the request */
  change_area?: "band" | "stone" | "setting" | "size" | "other";
};
/**
 * **P0** · Design Studio · /design-studio
 * Fires when: A new version (v2, v3…) is generated from a change the user asked for in Refine.
 */
export const designVersionCreated = (props: DesignVersionCreatedProps) => amplitude.track('design_version_created', props);

export type DesignVersionRestoredProps = {
  design_id: string;
  version_number: number;
};
/**
 * **P2** · Design Studio · /design-studio
 * Fires when: The user taps an earlier version to go back to it.
 */
export const designVersionRestored = (props: DesignVersionRestoredProps) => amplitude.track('design_version_restored', props);

export type DesignNamedProps = {
  design_id: string;
  name_source: "suggested" | "custom";
};
/**
 * **P2** · Design Studio · /design-studio
 * Fires when: NAME IT is confirmed.
 */
export const designNamed = (props: DesignNamedProps) => amplitude.track('design_named', props);

export type DesignFinalizeStartedProps = {
  design_id: string;
  version_number: number;
  /** Total versions before finalizing */
  versions_created?: number;
};
/**
 * **P0** · Design Studio · /design-studio
 * Fires when: FINALIZE MATERIALS is clicked.
 */
export const designFinalizeStarted = (props: DesignFinalizeStartedProps) => amplitude.track('design_finalize_started', props);

export type SavedDesignsOpenedProps = {
  action?: "expanded" | "design_opened" | "new_design";
};
/**
 * **P2** · Design Studio · /design-studio sidebar
 * Fires when: The saved-designs drawer is expanded, or a saved design is opened from it.
 */
export const savedDesignsOpened = (props: SavedDesignsOpenedProps = {}) => amplitude.track('saved_designs_opened', props);

export type StudioExitedProps = {
  step: "describe" | "direct" | "refine" | "finalize" | "buy";
  design_id?: string;
  versions_created?: number;
};
/**
 * **P1** · Design Studio · /design-studio
 * Fires when: The studio exit (X) is clicked. Shows where people abandon.
 */
export const studioExited = (props: StudioExitedProps) => amplitude.track('studio_exited', props);

export type DesignPostedToCommunityProps = {
  design_id: string;
  product_type_slug?: string;
};
/**
 * **P1** · Community · /design-studio, /my-activity
 * Fires when: A design is shared to the Community feed.
 * Already sent by the current site: keep the same name.
 */
export const designPostedToCommunity = (props: DesignPostedToCommunityProps) => amplitude.track('design_posted_to_community', props);

export type ProductListViewedProps = {
  /** shop_all, shop_by_category, halloween_picks, gift_edit, first_fine_jewelry, engagement, you_might_also_like, made_for_you */
  list_name: string;
  category?: string;
  product_count?: number;
};
/**
 * **P1** · Shop · Home, /shop, product pages
 * Fires when: A product grid or rail scrolls into view (once per list per page view).
 */
export const productListViewed = (props: ProductListViewedProps) => amplitude.track('product_list_viewed', props);

export type ProductListFilteredProps = {
  filter_type: "category" | "recipient" | "style" | "price";
  filter_value: string;
  list_name?: string;
};
/**
 * **P1** · Shop · /shop, home tabs
 * Fires when: A category tile, filter or tab (For Her / For Him, SOLITAIRE / TOI ET MOI) changes the product list.
 */
export const productListFiltered = (props: ProductListFilteredProps) => amplitude.track('product_list_filtered', props);

export type ProductClickedProps = {
  /** Slug, e.g. pear-bypass-ring */
  product_id: string;
  product_name: string;
  price: number;
  list_name: string;
  /** 0-based position in the list */
  position?: number;
  click_target?: "card" | "customize_button";
};
/**
 * **P0** · Shop · Any product card
 * Fires when: A product card (image, name or CUSTOMIZE) is clicked.
 */
export const productClicked = (props: ProductClickedProps) => amplitude.track('product_clicked', props);

export type ProductViewedProps = {
  product_id: string;
  product_name: string;
  /** ring, necklace, earrings, bracelet, pendant, cufflinks, wedding_band, set */
  product_type_slug: string;
  /** Starting price as shown */
  price: number;
  currency: string;
  /** Designer credited on the page, if any */
  designer_id?: string;
};
/**
 * **P0** · Shop · /shop/{product}
 * Fires when: A product page loads.
 */
export const productViewed = (props: ProductViewedProps) => amplitude.track('product_viewed', props);

export type ProductOptionSelectedProps = {
  context: "product_page" | "studio_finalize";
  option_type: "metal" | "karat" | "metal_color" | "ring_size" | "length" | "centre_stone" | "carat" | "shape" | "quality" | "side_stones";
  option_value: string;
  /** Product slug, or design_id in the studio */
  product_id?: string;
  /** Price shown after the change */
  price_after?: number;
};
/**
 * **P0** · Shop · Product pages, studio Finalize step
 * Fires when: A configurable option changes: metal, karat, gold colour, ring size, length, centre stone, carat, shape, quality, side stones.
 */
export const productOptionSelected = (props: ProductOptionSelectedProps) => amplitude.track('product_option_selected', props);

export type PriceBreakdownViewedProps = {
  context: "product_page" | "studio_finalize" | "checkout";
  product_id?: string;
  price?: number;
};
/**
 * **P1** · Shop · Product pages, studio Finalize
 * Fires when: View price breakdown / Price breakdown is opened. The site's transparency promise ("Every dollar, on the receipt").
 */
export const priceBreakdownViewed = (props: PriceBreakdownViewedProps) => amplitude.track('price_breakdown_viewed', props);

export type ProductInfoOpenedProps = {
  panel: "product_journey" | "return_policy" | "size_visualiser" | "length_guide" | "stone_info";
  product_id?: string;
};
/**
 * **P2** · Shop · Product pages
 * Fires when: PRODUCT JOURNEY, RETURN POLICY, "See how big they look", "See where each length sits" or similar info panels are opened.
 */
export const productInfoOpened = (props: ProductInfoOpenedProps) => amplitude.track('product_info_opened', props);

export type DeliveryEstimateCheckedProps = {
  product_id?: string;
  estimate_days?: number;
  country?: string;
};
/**
 * **P2** · Shop · Product pages
 * Fires when: A ZIP code is entered and Check is clicked.
 */
export const deliveryEstimateChecked = (props: DeliveryEstimateCheckedProps = {}) => amplitude.track('delivery_estimate_checked', props);

export type SizeGuideOpenedProps = {
  context: "product_page" | "studio_finalize" | "footer" | "direct";
  product_type_slug?: string;
};
/**
 * **P1** · Shop · Product pages, studio, /size-guide
 * Fires when: Find your ring size / Find your bracelet length / Size guide is opened.
 */
export const sizeGuideOpened = (props: SizeGuideOpenedProps) => amplitude.track('size_guide_opened', props);

export type SizeGuideMethodSelectedProps = {
  method: "know_my_size" | "measure_ring" | "measure_finger" | "gift" | "all_sizes";
  product_type_slug?: string;
};
/**
 * **P2** · Shop · /size-guide
 * Fires when: A sizing path is chosen.
 */
export const sizeGuideMethodSelected = (props: SizeGuideMethodSelectedProps) => amplitude.track('size_guide_method_selected', props);

export type WishlistItemAddedProps = {
  product_id: string;
  price?: number;
  context?: "product_page" | "product_card" | "community";
};
/**
 * **P1** · Shop · Product cards, product pages
 * Fires when: Save to wishlist / heart is turned on.
 */
export const wishlistItemAdded = (props: WishlistItemAddedProps) => amplitude.track('wishlist_item_added', props);

export type WishlistItemRemovedProps = {
  product_id: string;
};
/**
 * **P2** · Shop · Product cards, product pages, My Activity › Wishlist
 * Fires when: A saved item is un-saved.
 */
export const wishlistItemRemoved = (props: WishlistItemRemovedProps) => amplitude.track('wishlist_item_removed', props);

export type ContentSharedProps = {
  content_type: "product" | "community_post" | "design";
  content_id: string;
  /** copy_link, whatsapp, pinterest, instagram, native_share */
  channel?: string;
};
/**
 * **P2** · Shop · Product pages, community, profile
 * Fires when: Share is clicked on a product, community post or design.
 */
export const contentShared = (props: ContentSharedProps) => amplitude.track('content_shared', props);

export type CartItemAddedProps = {
  product_id: string;
  product_name?: string;
  price: number;
  currency: string;
  quantity?: number;
  is_set?: boolean;
  metal?: string;
  size?: string;
  centre_stone?: string;
};
/**
 * **P0** · Checkout & Orders · Product pages, studio
 * Fires when: Add to cart or Add set is clicked.
 */
export const cartItemAdded = (props: CartItemAddedProps) => amplitude.track('cart_item_added', props);

export type BuyNowClickedProps = {
  context: "product_page" | "studio_finalize";
  /** Product slug, or design_id in the studio */
  product_id?: string;
  price: number;
  currency: string;
  /** Whether the monthly-payment option was displayed */
  financing_shown?: boolean;
};
/**
 * **P0** · Checkout & Orders · Product pages, studio Finalize
 * Fires when: BUY NOW is clicked.
 */
export const buyNowClicked = (props: BuyNowClickedProps) => amplitude.track('buy_now_clicked', props);

export type CartViewedProps = {
  item_count?: number;
  cart_value?: number;
};
/**
 * **P1** · Checkout & Orders · Header bag
 * Fires when: The bag opens.
 */
export const cartViewed = (props: CartViewedProps = {}) => amplitude.track('cart_viewed', props);

export type CartItemRemovedProps = {
  product_id: string;
  price?: number;
};
/**
 * **P1** · Checkout & Orders · Bag, checkout
 * Fires when: Remove is clicked, or quantity goes to 0.
 */
export const cartItemRemoved = (props: CartItemRemovedProps) => amplitude.track('cart_item_removed', props);

export type CheckoutStartedProps = {
  source: "cart" | "buy_now_product" | "buy_now_studio";
  value: number;
  currency: string;
  item_count: number;
  /** Cart contains a studio-designed piece */
  has_custom_design?: boolean;
};
/**
 * **P0** · Checkout & Orders · /checkout
 * Fires when: The checkout page loads with at least one item. Replaces design_checkout_started, which only covered the studio.
 */
export const checkoutStarted = (props: CheckoutStartedProps) => amplitude.track('checkout_started', props);

export type CheckoutStepCompletedProps = {
  step: "contact" | "shipping_address" | "delivery" | "gifting";
  step_number: number;
};
/**
 * **P0** · Checkout & Orders · /checkout
 * Fires when: A checkout section is completed and validated.
 */
export const checkoutStepCompleted = (props: CheckoutStepCompletedProps) => amplitude.track('checkout_step_completed', props);

export type DeliveryOptionSelectedProps = {
  option: "insured_standard" | "express_insured";
  cost?: number;
};
/**
 * **P1** · Checkout & Orders · /checkout
 * Fires when: A delivery option is chosen.
 */
export const deliveryOptionSelected = (props: DeliveryOptionSelectedProps) => amplitude.track('delivery_option_selected', props);

export type PromoCodeAppliedProps = {
  /** Campaign codes only (e.g. SPELL13). Hash or omit unique gift-card numbers. */
  code: string;
  code_type?: "promo" | "gift_card";
  success: boolean;
  discount_value?: number;
};
/**
 * **P1** · Checkout & Orders · /checkout
 * Fires when: APPLY is clicked on a gift card or promo code (fire for success and failure).
 */
export const promoCodeApplied = (props: PromoCodeAppliedProps) => amplitude.track('promo_code_applied', props);

export type GiftOptionsSetProps = {
  gift_wrap?: boolean;
  has_note?: boolean;
};
/**
 * **P2** · Checkout & Orders · /checkout › Gifting
 * Fires when: Gifting is turned on or the gift note is saved.
 */
export const giftOptionsSet = (props: GiftOptionsSetProps = {}) => amplitude.track('gift_options_set', props);

export type ProgressUpdatesOptedInProps = {
  opted_in: boolean;
};
/**
 * **P2** · Checkout & Orders · /checkout › Contact
 * Fires when: "Text and email me progress photos" is ticked.
 */
export const progressUpdatesOptedIn = (props: ProgressUpdatesOptedInProps) => amplitude.track('progress_updates_opted_in', props);

export type PaymentStartedProps = {
  value: number;
  currency: string;
  delivery_option?: string;
  has_promo?: boolean;
};
/**
 * **P0** · Checkout & Orders · /checkout
 * Fires when: CONTINUE TO PAYMENT is clicked.
 */
export const paymentStarted = (props: PaymentStartedProps) => amplitude.track('payment_started', props);

// order_completed: sent from the server. See analytics/sdk/server.ts.

// payment_failed: sent from the server. See analytics/sdk/server.ts.

export type ActivityTabViewedProps = {
  tab: "messages" | "orders" | "earnings" | "referrals" | "wishlist" | "designs";
};
/**
 * **P1** · My Activity · /my-activity
 * Fires when: A My Activity tab is opened.
 */
export const activityTabViewed = (props: ActivityTabViewedProps) => amplitude.track('activity_tab_viewed', props);

export type OrderTrackingExpandedProps = {
  order_id: string;
  /** Step N of 7 */
  current_step?: number;
};
/**
 * **P1** · My Activity · /my-activity › Orders
 * Fires when: An order card is expanded.
 * Already sent by the current site: keep the same name.
 */
export const orderTrackingExpanded = (props: OrderTrackingExpandedProps) => amplitude.track('order_tracking_expanded', props);

export type OrderStageDetailsViewedProps = {
  order_id: string;
  stage: string;
};
/**
 * **P2** · My Activity · /my-activity › Orders
 * Fires when: A production stage (Idea, Design, CAD, Gemstone, Crafting, Certified, Delivered) is opened.
 * Already sent by the current site: keep the same name.
 */
export const orderStageDetailsViewed = (props: OrderStageDetailsViewedProps) => amplitude.track('order_stage_details_viewed', props);

export type CadReviewOpenedProps = {
  order_id: string;
  revision_number?: number;
};
/**
 * **P0** · My Activity · /my-activity
 * Fires when: REVIEW CAD is clicked on an order that needs approval.
 */
export const cadReviewOpened = (props: CadReviewOpenedProps) => amplitude.track('cad_review_opened', props);

// cad_approved: sent from the server. See analytics/sdk/server.ts.

export type CadChangesRequestedProps = {
  order_id: string;
  revision_number: number;
};
/**
 * **P0** · My Activity · /my-activity
 * Fires when: The customer asks for changes to the CAD.
 */
export const cadChangesRequested = (props: CadChangesRequestedProps) => amplitude.track('cad_changes_requested', props);

export type MessageSentProps = {
  thread_type: "studio" | "order" | "designer";
  order_id?: string;
};
/**
 * **P1** · My Activity · /my-activity
 * Fires when: A message is sent via Message the studio / MESSAGE ABOUT THIS ORDER.
 */
export const messageSent = (props: MessageSentProps) => amplitude.track('message_sent', props);

export type OrderDocumentDownloadedProps = {
  order_id: string;
  document_type: "invoice" | "certificate";
};
/**
 * **P2** · My Activity · /my-activity
 * Fires when: An invoice or certificate is downloaded.
 */
export const orderDocumentDownloaded = (props: OrderDocumentDownloadedProps) => amplitude.track('order_document_downloaded', props);

export type OrderPaymentRetryClickedProps = {
  order_id: string;
};
/**
 * **P1** · My Activity · /my-activity
 * Fires when: A failed payment is retried.
 * Already sent by the current site: keep the same name.
 */
export const orderPaymentRetryClicked = (props: OrderPaymentRetryClickedProps) => amplitude.track('order_payment_retry_clicked', props);

export type ActivityDesignEditedProps = {
  design_id: string;
};
/**
 * **P2** · My Activity · /my-activity
 * Fires when: A saved design is reopened for editing.
 * Already sent by the current site: keep the same name.
 */
export const activityDesignEdited = (props: ActivityDesignEditedProps) => amplitude.track('activity_design_edited', props);

export type ActivityDesignRemovedProps = {
  design_id: string;
};
/**
 * **P2** · My Activity · /my-activity
 * Fires when: A saved design is deleted.
 * Already sent by the current site: keep the same name.
 */
export const activityDesignRemoved = (props: ActivityDesignRemovedProps) => amplitude.track('activity_design_removed', props);

export type ActivityCommunityStatusToggledProps = {
  design_id: string;
  is_public: boolean;
};
/**
 * **P2** · My Activity · /my-activity
 * Fires when: A saved design is made public or private.
 * Already sent by the current site: keep the same name.
 */
export const activityCommunityStatusToggled = (props: ActivityCommunityStatusToggledProps) => amplitude.track('activity_community_status_toggled', props);

export type CommunityFeedViewedProps = {
  feed: "for_you" | "following" | "latest";
};
/**
 * **P1** · Community · /community
 * Fires when: The feed loads or a feed tab is switched.
 */
export const communityFeedViewed = (props: CommunityFeedViewedProps) => amplitude.track('community_feed_viewed', props);

export type CommunityFilterAppliedProps = {
  filter_type: "category" | "content_type";
  filter_value: string;
};
/**
 * **P2** · Community · /community
 * Fires when: A category (Rings, Earrings…) or content filter (Designed in the studio, Behind the bench, Worn by you) is chosen.
 * Already sent by the current site: keep the same name.
 */
export const communityFilterApplied = (props: CommunityFilterAppliedProps) => amplitude.track('community_filter_applied', props);

export type CommunityPostOpenedProps = {
  post_id: string;
  post_type?: "studio_design" | "behind_the_bench" | "worn_by_you" | "product";
  author_role?: string;
  position?: number;
};
/**
 * **P1** · Community · /community, profiles
 * Fires when: A post is opened.
 */
export const communityPostOpened = (props: CommunityPostOpenedProps) => amplitude.track('community_post_opened', props);

export type CommunityLikeToggledProps = {
  post_id: string;
  liked: boolean;
};
/**
 * **P1** · Community · /community, profiles
 * Fires when: A post is liked or unliked.
 * Already sent by the current site: keep the same name.
 */
export const communityLikeToggled = (props: CommunityLikeToggledProps) => amplitude.track('community_like_toggled', props);

export type CommunityDesignCustomisedProps = {
  post_id: string;
  product_type_slug?: string;
};
/**
 * **P0** · Community · /community
 * Fires when: CUSTOMISE is clicked on a community post: the community-to-studio handoff.
 */
export const communityDesignCustomised = (props: CommunityDesignCustomisedProps) => amplitude.track('community_design_customised', props);

export type CommunityPostCreatedProps = {
  post_type: "studio_design" | "behind_the_bench" | "worn_by_you";
  has_image?: boolean;
};
/**
 * **P1** · Community · /community, /profile
 * Fires when: SHARE YOUR WORK / Share something is published.
 */
export const communityPostCreated = (props: CommunityPostCreatedProps) => amplitude.track('community_post_created', props);

export type UserFollowedProps = {
  target_user_role?: string;
  following: boolean;
};
/**
 * **P2** · Community · Profiles, community
 * Fires when: FOLLOW is clicked (fire unfollow with following=false).
 */
export const userFollowed = (props: UserFollowedProps) => amplitude.track('user_followed', props);

export type ProfileViewedProps = {
  is_own_profile: boolean;
  /** designer, maker, collector, affiliate */
  profile_role?: string;
};
/**
 * **P2** · Account · /profile
 * Fires when: A profile page loads.
 */
export const profileViewed = (props: ProfileViewedProps) => amplitude.track('profile_viewed', props);

export type ProfileTabViewedProps = {
  tab: "feed" | "salon" | "store" | "about";
  is_own_profile?: boolean;
};
/**
 * **P2** · Account · /profile
 * Fires when: Feed / Salon / Store / About tab is opened.
 */
export const profileTabViewed = (props: ProfileTabViewedProps) => amplitude.track('profile_tab_viewed', props);

/**
 * **P2** · Account · /profile
 * Fires when: Profile edits are saved.
 * Already sent by the current site: keep the same name.
 */
export const profileEditSaved = () => amplitude.track('profile_edit_saved');

export type ProfileShareClickedProps = {
  is_own_profile?: boolean;
};
/**
 * **P2** · Account · /profile
 * Fires when: SHARE / Share profile is clicked.
 * Already sent by the current site: keep the same name.
 */
export const profileShareClicked = (props: ProfileShareClickedProps = {}) => amplitude.track('profile_share_clicked', props);

export type ReferralLinkSharedProps = {
  channel?: string;
  location?: "profile" | "my_activity";
};
/**
 * **P1** · Account · /profile, /my-activity › Referrals
 * Fires when: SHARE AND EARN / a referral link is copied or shared.
 */
export const referralLinkShared = (props: ReferralLinkSharedProps = {}) => amplitude.track('referral_link_shared', props);

export type SignUpProps = {
  method: "email" | "google" | "apple";
  /** What prompted it: studio_save, checkout, community_like, header */
  trigger_point?: string;
};
/**
 * **P0** · Account · Sign-up flow
 * Fires when: An account is created. Call setUserId at the same moment.
 */
export const signUp = (props: SignUpProps) => amplitude.track('sign_up', props);

export type LoginProps = {
  method: "email" | "google" | "apple";
};
/**
 * **P1** · Account · Login
 * Fires when: A user signs in.
 */
export const login = (props: LoginProps) => amplitude.track('login', props);

export type NewsletterSignedUpProps = {
  /** footer, popup, checkout */
  source: string;
};
/**
 * **P1** · Account · Footer "Takshila in your mailbox" on every page
 * Fires when: Subscribe succeeds with a valid email. Never send the email.
 */
export const newsletterSignedUp = (props: NewsletterSignedUpProps) => amplitude.track('newsletter_signed_up', props);

export type DesignerCtaClickedProps = {
  cta: "open_designer_studio" | "sell_your_designs" | "apply_as_maker" | "make_with_us";
  location: string;
};
/**
 * **P1** · Supply · /how-takshila-works, /profile, /design-studio
 * Fires when: A supply-side CTA is clicked: OPEN DESIGNER STUDIO, SELL YOUR DESIGNS, APPLY AS A MAKER, MAKE WITH US, "Designing to earn?".
 */
export const designerCtaClicked = (props: DesignerCtaClickedProps) => amplitude.track('designer_cta_clicked', props);

export type DesignerDesignPublishedProps = {
  design_id: string;
  product_type_slug?: string;
  price?: number;
};
/**
 * **P1** · Supply · /designer-studio
 * Fires when: A designer publishes a design for sale.
 */
export const designerDesignPublished = (props: DesignerDesignPublishedProps) => amplitude.track('designer_design_published', props);

export type ContactFormSubmittedProps = {
  /** Value of the topic dropdown */
  topic: string;
  has_order_number?: boolean;
};
/**
 * **P1** · Support · /contact
 * Fires when: SEND MESSAGE succeeds.
 */
export const contactFormSubmitted = (props: ContactFormSubmittedProps) => amplitude.track('contact_form_submitted', props);

export type FaqOpenedProps = {
  question: string;
};
/**
 * **P2** · Support · /contact
 * Fires when: A FAQ question is expanded.
 */
export const faqOpened = (props: FaqOpenedProps) => amplitude.track('faq_opened', props);

export type ProcessStageViewedProps = {
  stage: "idea" | "design" | "cad" | "gemstone" | "crafting" | "certified" | "delivered";
};
/**
 * **P2** · Support · Home, /how-takshila-works
 * Fires when: A stage in the 01 Idea → 07 Delivered explainer is clicked.
 */
export const processStageViewed = (props: ProcessStageViewedProps) => amplitude.track('process_stage_viewed', props);

export type CampaignInteractedProps = {
  /** e.g. halloween_2026 */
  campaign: string;
  /** e.g. lights_toggled, pumpkin_picked */
  action: string;
};
/**
 * **P2** · Marketing · Home seasonal sections
 * Fires when: An interactive seasonal element is used (Halloween lights switch, Pick a pumpkin).
 */
export const campaignInteracted = (props: CampaignInteractedProps) => amplitude.track('campaign_interacted', props);

/* ------------------------------------------------------------------ */
/* Deprecated: do not send these on the new site                      */
/* ------------------------------------------------------------------ */
// design_category_selected: The new studio is prompt-first; there is no category picker. The product type now comes from design_brief_understood.product_type_slug.
// design_product_type_selected: Same as above.
// design_checkout_started: Replaced by checkout_started with source = buy_now_studio, which also covers shop purchases.
// design_localized: Replaced by design_version_created (each requested change creates a new version).
// design_tab_switched: The new studio uses a step flow; replaced by studio_step_viewed.
// community_rated: The new design has likes, no ratings.
