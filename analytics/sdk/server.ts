// GENERATED FILE. Do not edit by hand.
// Source: analytics/new-site-events.json  ·  Regenerate: python3 analytics/build_tracking_sdk.py
// Server-side events: send these from the backend (payment webhook, CAD approval handler),
// never from the browser, so ad blockers and closed tabs cannot lose them.

import * as amplitude from '@amplitude/analytics-node';

let ready = false;
/** Call once at server start-up with the same project's API key. */
export function initServerAnalytics(apiKey: string) {
  amplitude.init(apiKey, { flushIntervalMillis: 1000 });
  ready = true;
}

/** Who the event belongs to. Pass device_id too when you have it, so web and server events join up. */
export type Actor = { user_id: string; device_id?: string };

function send(eventType: string, actor: Actor, props: object, extra: Partial<amplitude.Types.EventOptions> = {}) {
  if (!ready) throw new Error('initServerAnalytics() has not been called');
  return amplitude.track(eventType, props as Record<string, unknown>, { ...actor, ...extra }).promise;
}

export type OrderCompletedProps = {
  order_id: string;
  revenue: number;
  currency: string;
  item_count?: number;
  product_type_slug?: string;
  has_custom_design?: boolean;
  coupon?: string;
  delivery_option?: string;
  /** card, paypal, apple_pay, klarna, financing */
  payment_method?: string;
};
/**
 * **P0** · Fires when: Payment succeeds. Send from the server once per order, with revenue, so Amplitude revenue charts work.
 */
export function orderCompleted(actor: Actor, props: OrderCompletedProps) {
  // insert_id = order_id makes retries of the same webhook count once.
  // revenue/price/quantity make the order show up in Amplitude revenue charts.
  return send('order_completed', actor, props, {
    insert_id: `order_completed:${props.order_id}`,
    revenue: props.revenue,
    price: props.revenue,
    quantity: 1,
    revenueType: 'purchase',
  });
}

/** Call right after orderCompleted with the user's new totals from your database. */
export function updateCustomerTotals(actor: Actor, totals: { orders_count: number; lifetime_revenue: number; country?: string }) {
  const id = new amplitude.Identify();
  id.set('orders_count', totals.orders_count).set('lifetime_revenue', totals.lifetime_revenue);
  if (totals.country) id.set('country', totals.country);
  return amplitude.identify(id, actor).promise;
}

export type PaymentFailedProps = {
  order_id?: string;
  reason?: string;
  payment_method?: string;
};
/**
 * **P0** · Fires when: A payment attempt is declined or errors.
 */
export const paymentFailed = (actor: Actor, props: PaymentFailedProps) => send('payment_failed', actor, props);

export type CadApprovedProps = {
  order_id: string;
  revision_number: number;
  /** Hours since the CAD was sent */
  hours_to_approve?: number;
};
/**
 * **P0** · Fires when: The customer approves the CAD (production can start).
 */
export const cadApproved = (actor: Actor, props: CadApprovedProps) => send('cad_approved', actor, props);

/** Mark staff and test accounts so dashboards can exclude them. Call when the account is created or its role changes. */
export function setInternal(actor: Actor, isInternal: boolean) {
  return amplitude.identify(new amplitude.Identify().set('is_internal', isInternal), actor).promise;
}

/** Call before the process exits (and at the end of serverless handlers). */
export const flushAnalytics = () => amplitude.flush().promise;
