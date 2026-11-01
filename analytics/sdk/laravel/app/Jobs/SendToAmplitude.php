<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Sends one event to Amplitude's HTTP V2 API.
 * Retries on rate limits and server errors; gives up (and logs) on invalid payloads.
 */
class SendToAmplitude implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 5;

    /** Seconds between retries: 10s, 1m, 5m, 15m. */
    public array $backoff = [10, 60, 300, 900];

    public function __construct(public array $event) {}

    public function handle(): void
    {
        $response = Http::timeout(10)
            ->acceptJson()
            ->post(rtrim(config('amplitude.endpoint'), '/').'/2/httpapi', [
                'api_key' => config('amplitude.api_key'),
                'events' => [$this->event],
            ]);

        if ($response->successful()) {
            return;
        }

        // 400/413: the event itself is wrong. Retrying won't help, so log it for the server logs.
        if (in_array($response->status(), [400, 413], true)) {
            Log::warning('Amplitude rejected event', [
                'event_type' => $this->event['event_type'] ?? null,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
            $this->fail(new \RuntimeException('Amplitude rejected event '.($this->event['event_type'] ?? '?')));

            return;
        }

        // 429 and 5xx: retry with backoff.
        throw new \RuntimeException('Amplitude HTTP '.$response->status().', will retry');
    }
}
