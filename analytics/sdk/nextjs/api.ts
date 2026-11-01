'use client';

/**
 * Adds the visitor's Amplitude device id to every request to the Laravel API, so events the
 * backend sends (order_completed, cad_approved…) join the same visitor's browser session.
 * Laravel reads it with Actor::fromRequest($request).
 */
import * as amplitude from '@amplitude/analytics-browser';

export function amplitudeHeaders(): Record<string, string> {
  const deviceId = amplitude.getDeviceId();
  return deviceId ? { 'X-Amplitude-Device-Id': deviceId } : {};
}

/** fetch() wrapper for the Laravel API: Sanctum cookie auth plus the device id header. */
export function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: { Accept: 'application/json', ...amplitudeHeaders(), ...(init.headers ?? {}) },
  });
}

// Using axios instead? Add an interceptor once:
//   api.interceptors.request.use((config) => { Object.assign(config.headers, amplitudeHeaders()); return config; });
