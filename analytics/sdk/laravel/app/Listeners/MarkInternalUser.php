<?php

namespace App\Listeners;

use App\Analytics\Actor;
use App\Analytics\ServerEvents;
use Illuminate\Auth\Events\Registered;

/**
 * Flags staff and test accounts with is_internal = true in Amplitude when they register,
 * so every dashboard can exclude internal traffic.
 *
 * Laravel 11+ discovers this listener automatically. If you assign Spatie roles later,
 * call ServerEvents::setInternal() again after the role changes.
 */
class MarkInternalUser
{
    public function __construct(private ServerEvents $events) {}

    public function handle(Registered $event): void
    {
        $user = $event->user;
        $domain = strtolower(substr(strrchr((string) $user->email, '@') ?: '', 1));

        $internal = in_array($domain, config('amplitude.internal_email_domains', []), true)
            || (method_exists($user, 'hasAnyRole') && $user->hasAnyRole(config('amplitude.internal_roles', [])));

        $this->events->setInternal(Actor::user($user->getAuthIdentifier()), $internal);
    }
}
