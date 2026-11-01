<?php

namespace App\Analytics;

use Illuminate\Http\Request;

/**
 * Who an analytics event belongs to.
 *
 * user_id   Your own user id (never the email). Required by Amplitude unless device_id is set.
 * device_id Amplitude's browser device id, so server events join the visitor's web session.
 *           The Next.js app sends it in the X-Amplitude-Device-Id header; store it on the order
 *           at checkout so payment webhooks (which have no browser) can still use it.
 */
final class Actor
{
    public function __construct(
        public readonly ?string $userId = null,
        public readonly ?string $deviceId = null,
    ) {
        if ($userId === null && $deviceId === null) {
            throw new \InvalidArgumentException('An analytics Actor needs a user id or a device id.');
        }
    }

    public static function user(int|string $userId, ?string $deviceId = null): self
    {
        return new self((string) $userId, $deviceId);
    }

    /** The signed-in user and the device id header of the current request. */
    public static function fromRequest(Request $request): self
    {
        return new self(
            $request->user()?->getAuthIdentifier() !== null ? (string) $request->user()->getAuthIdentifier() : null,
            $request->header('X-Amplitude-Device-Id') ?: null,
        );
    }

    public function toArray(): array
    {
        return array_filter(['user_id' => $this->userId, 'device_id' => $this->deviceId], fn ($v) => $v !== null);
    }
}
