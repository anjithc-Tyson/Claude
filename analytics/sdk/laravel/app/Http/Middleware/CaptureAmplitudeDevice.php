<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Keeps the visitor's Amplitude device id (sent by the Next.js app in the
 * X-Amplitude-Device-Id header) available to controllers, so server-side events
 * join the same session as the browser events.
 *
 * Register it on the API group in bootstrap/app.php:
 *   ->withMiddleware(fn ($m) => $m->appendToGroup('api', \App\Http\Middleware\CaptureAmplitudeDevice::class))
 */
class CaptureAmplitudeDevice
{
    public function handle(Request $request, Closure $next): Response
    {
        $deviceId = $request->header('X-Amplitude-Device-Id');

        // Device ids are opaque strings from the SDK; reject anything that isn't plausibly one.
        if ($deviceId !== null && ! preg_match('/^[A-Za-z0-9._\-]{8,128}$/', $deviceId)) {
            $request->headers->remove('X-Amplitude-Device-Id');
        }

        return $next($request);
    }
}
