<?php

namespace App\Analytics;

use App\Jobs\SendToAmplitude;

/**
 * Low-level client. Prefer the typed methods in ServerEvents; use this directly only for
 * events that are not in the spec yet.
 *
 * Every call is queued, so a slow or failing Amplitude never slows down a request.
 */
class Amplitude
{
    /**
     * @param  array<string, scalar|null>  $properties  event properties
     * @param  array<string, mixed>        $options     top-level event fields: insert_id, revenue, price, quantity, revenueType, time
     */
    public function track(string $eventType, Actor $actor, array $properties = [], array $options = []): void
    {
        $properties = array_filter($properties, fn ($v) => $v !== null);

        $this->dispatch(array_merge($actor->toArray(), $options, [
            'event_type' => $eventType,
            // An empty array would encode as JSON [], which Amplitude rejects; send {} instead.
            'event_properties' => $properties === [] ? new \stdClass : $properties,
            'time' => $options['time'] ?? (int) floor(microtime(true) * 1000),
            'platform' => 'Web',
            'library' => 'takshila-laravel/1.0',
        ]));
    }

    /**
     * Set user properties ($set). Pass null to leave a property unchanged.
     *
     * @param  array<string, scalar|null>  $userProperties
     */
    public function identify(Actor $actor, array $userProperties): void
    {
        $set = array_filter($userProperties, fn ($v) => $v !== null);
        if ($set === []) {
            return;
        }
        $this->dispatch(array_merge($actor->toArray(), [
            'event_type' => '$identify',
            'user_properties' => ['$set' => $set],
            'time' => (int) floor(microtime(true) * 1000),
            'library' => 'takshila-laravel/1.0',
        ]));
    }

    protected function dispatch(array $event): void
    {
        if (! config('amplitude.enabled') || ! config('amplitude.api_key')) {
            return;
        }
        SendToAmplitude::dispatch($event)->onQueue(config('amplitude.queue'));
    }
}
