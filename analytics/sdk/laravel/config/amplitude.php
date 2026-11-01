<?php

return [
    // Server-side API key of the Amplitude project. Use the dev project's key outside production.
    'api_key' => env('AMPLITUDE_API_KEY'),

    // Turn off in tests or local dev to skip sending entirely.
    'enabled' => env('AMPLITUDE_ENABLED', true),

    // https://api2.amplitude.com for US data centre, https://api.eu.amplitude.com for EU.
    'endpoint' => env('AMPLITUDE_ENDPOINT', 'https://api2.amplitude.com'),

    // Queue the send jobs run on. Analytics should never block a request or a payment webhook.
    'queue' => env('AMPLITUDE_QUEUE', 'analytics'),

    // Emails on these domains are flagged is_internal = true (see MarkInternalUser listener).
    'internal_email_domains' => ['takshila.co'],

    // Users with any of these Spatie roles are flagged is_internal = true.
    'internal_roles' => ['admin', 'staff', 'qa'],
];
