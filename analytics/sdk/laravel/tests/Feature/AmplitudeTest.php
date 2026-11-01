<?php

namespace Tests\Feature;

use App\Analytics\Actor;
use App\Analytics\ServerEvents;
use App\Jobs\SendToAmplitude;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class AmplitudeTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config([
            'amplitude.api_key' => 'test-key',
            'amplitude.enabled' => true,
            'amplitude.endpoint' => 'https://api2.amplitude.com',
            'amplitude.queue' => 'analytics',
            'queue.default' => 'sync',
        ]);
    }

    public function test_order_completed_is_queued_on_the_analytics_queue(): void
    {
        Queue::fake();

        app(ServerEvents::class)->orderCompleted(Actor::user(42, 'device-abc123'), orderId: 'TKS-2026-0157', revenue: 2313, currency: 'USD');

        Queue::assertPushedOn('analytics', SendToAmplitude::class, fn ($job) => $job->event['event_type'] === 'order_completed');
    }

    public function test_order_completed_sends_revenue_and_dedup_id(): void
    {
        Http::fake(['api2.amplitude.com/*' => Http::response(['code' => 200], 200)]);

        app(ServerEvents::class)->orderCompleted(
            Actor::user(42, 'device-abc123'),
            orderId: 'TKS-2026-0157',
            revenue: 2313,
            currency: 'USD',
            itemCount: 1,
            hasCustomDesign: true,
            coupon: 'SPELL13',
        );

        Http::assertSent(function (Request $request) {
            $e = $request['events'][0];

            return $request->url() === 'https://api2.amplitude.com/2/httpapi'
                && $request['api_key'] === 'test-key'
                && $e['event_type'] === 'order_completed'
                && $e['user_id'] === '42'
                && $e['device_id'] === 'device-abc123'
                && $e['insert_id'] === 'order_completed:TKS-2026-0157'
                && $e['revenue'] === 2313
                && $e['revenueType'] === 'purchase'
                && $e['event_properties']['coupon'] === 'SPELL13'
                && $e['event_properties']['has_custom_design'] === true
                && ! array_key_exists('payment_method', $e['event_properties']); // nulls are dropped
        });
    }

    public function test_identify_sets_user_properties(): void
    {
        Http::fake(['api2.amplitude.com/*' => Http::response(['code' => 200], 200)]);

        app(ServerEvents::class)->setInternal(Actor::user(7), true);

        Http::assertSent(fn (Request $r) => $r['events'][0]['event_type'] === '$identify'
            && $r['events'][0]['user_properties'] === ['$set' => ['is_internal' => true]]);
    }

    public function test_invalid_payload_is_logged_and_not_retried(): void
    {
        Http::fake(['api2.amplitude.com/*' => Http::response(['error' => 'Invalid field'], 400)]);
        $job = new SendToAmplitude(['event_type' => 'order_completed', 'user_id' => '1']);
        $job->withFakeQueueInteractions();

        $job->handle();

        $job->assertFailed();
    }

    public function test_rate_limit_throws_so_the_queue_retries(): void
    {
        Http::fake(['api2.amplitude.com/*' => Http::response([], 429)]);

        $this->expectException(\RuntimeException::class);
        (new SendToAmplitude(['event_type' => 'order_completed', 'user_id' => '1']))->handle();
    }

    public function test_nothing_is_sent_when_disabled(): void
    {
        config(['amplitude.enabled' => false]);
        Http::fake();

        app(ServerEvents::class)->cadApproved(Actor::user(1), orderId: 'TKS-1', revisionNumber: 1);

        Http::assertNothingSent();
    }

    public function test_staff_accounts_are_flagged_internal_on_registration(): void
    {
        Http::fake(['api2.amplitude.com/*' => Http::response(['code' => 200], 200)]);
        $staff = (new \App\Models\User)->forceFill(['id' => 5, 'email' => 'ana@takshila.co']);
        $buyer = (new \App\Models\User)->forceFill(['id' => 6, 'email' => 'maya@gmail.com']);

        event(new \Illuminate\Auth\Events\Registered($staff));
        event(new \Illuminate\Auth\Events\Registered($buyer));

        Http::assertSent(fn (Request $r) => $r['events'][0]['user_id'] === '5'
            && $r['events'][0]['user_properties']['$set']['is_internal'] === true);
        Http::assertSent(fn (Request $r) => $r['events'][0]['user_id'] === '6'
            && $r['events'][0]['user_properties']['$set']['is_internal'] === false);
    }

    public function test_actor_needs_an_identity(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        new Actor();
    }
}
