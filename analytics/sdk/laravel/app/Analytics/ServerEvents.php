<?php

// GENERATED FILE. Do not edit by hand.
// Source: analytics/new-site-events.json  ·  Regenerate: python3 analytics/build_tracking_sdk.py

namespace App\Analytics;

/**
 * Server-side Takshila events. Inject this class (or resolve it with app(ServerEvents::class))
 * and call it from the payment webhook, the CAD approval handler and account creation.
 * Everything is queued; nothing here blocks the request.
 */
class ServerEvents
{
    public function __construct(private Amplitude $amplitude) {}

    /**
     * **P0** · Payment succeeds. Send from the server once per order, with revenue, so Amplitude revenue charts work.
     * @param string $paymentMethod card, paypal, apple_pay, klarna, financing
     */
    public function orderCompleted(
        Actor $actor,
        string $orderId,
        int|float $revenue,
        string $currency,
        int|float|null $itemCount = null,
        string|null $productTypeSlug = null,
        bool|null $hasCustomDesign = null,
        string|null $coupon = null,
        string|null $deliveryOption = null,
        string|null $paymentMethod = null,
    ): void {
        $this->amplitude->track('order_completed', $actor, [
            'order_id' => $orderId,
            'revenue' => $revenue,
            'currency' => $currency,
            'item_count' => $itemCount,
            'product_type_slug' => $productTypeSlug,
            'has_custom_design' => $hasCustomDesign,
            'coupon' => $coupon,
            'delivery_option' => $deliveryOption,
            'payment_method' => $paymentMethod,
        ], [
            // Same order id = same event: a webhook delivered twice is counted once.
            'insert_id' => 'order_completed:'.$orderId,
            // Top-level revenue fields make the order appear in Amplitude revenue charts.
            'revenue' => $revenue,
            'price' => $revenue,
            'quantity' => 1,
            'revenueType' => 'purchase',
        ]);
    }

    /**
     * **P0** · A payment attempt is declined or errors.
     */
    public function paymentFailed(
        Actor $actor,
        string|null $orderId = null,
        string|null $reason = null,
        string|null $paymentMethod = null,
    ): void {
        $this->amplitude->track('payment_failed', $actor, [
            'order_id' => $orderId,
            'reason' => $reason,
            'payment_method' => $paymentMethod,
        ]);
    }

    /**
     * **P0** · The customer approves the CAD (production can start).
     * @param int|float $hoursToApprove Hours since the CAD was sent
     */
    public function cadApproved(
        Actor $actor,
        string $orderId,
        int|float $revisionNumber,
        int|float|null $hoursToApprove = null,
    ): void {
        $this->amplitude->track('cad_approved', $actor, [
            'order_id' => $orderId,
            'revision_number' => $revisionNumber,
            'hours_to_approve' => $hoursToApprove,
        ]);
    }

    /** Call right after orderCompleted with the customer's new totals from the database. */
    public function updateCustomerTotals(Actor $actor, int $ordersCount, int|float $lifetimeRevenue, ?string $country = null): void
    {
        $this->amplitude->identify($actor, [
            'orders_count' => $ordersCount,
            'lifetime_revenue' => $lifetimeRevenue,
            'country' => $country,
        ]);
    }

    /** Flag staff and test accounts so dashboards can exclude them. */
    public function setInternal(Actor $actor, bool $isInternal): void
    {
        $this->amplitude->identify($actor, ['is_internal' => $isInternal]);
    }
}
