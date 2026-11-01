"""Generate the typed tracking module (analytics/sdk/tracking.ts) from new-site-events.json.

Usage: python3 analytics/build_tracking_sdk.py
Re-run whenever new-site-events.json changes, and commit the result.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
spec = json.loads((HERE / "new-site-events.json").read_text())
OUT = HERE / "sdk" / "tracking.ts"

TS = {"string": "string", "number": "number", "boolean": "boolean"}


def camel(s):
    a = s.split("_")
    return a[0] + "".join(w[:1].upper() + w[1:] for w in a[1:])


def pascal(s):
    return "".join(w[:1].upper() + w[1:] for w in s.split("_"))


def ts_type(p):
    if p.get("enum"):
        return " | ".join(json.dumps(v) for v in p["enum"])
    return TS[p["type"]]


def fields(props, indent="  "):
    out = []
    for p in props:
        if p.get("desc"):
            out.append(f"{indent}/** {p['desc']} */")
        out.append(f"{indent}{p['name']}{'' if p.get('required') else '?'}: {ts_type(p)};")
    return "\n".join(out)


lines = [
    "// GENERATED FILE. Do not edit by hand.",
    "// Source: analytics/new-site-events.json  ·  Regenerate: python3 analytics/build_tracking_sdk.py",
    f"// Spec: {spec['meta']['title']} ({len(spec['events'])} events)",
    "",
    "import * as amplitude from '@amplitude/analytics-browser';",
    "",
    "/* ------------------------------------------------------------------ */",
    "/* Setup                                                              */",
    "/* ------------------------------------------------------------------ */",
    "",
    "export type PageType = " + " | ".join(json.dumps(v) for v in spec["global_event_properties"][0]["enum"]) + ";",
    "",
    "/** Sent on every event by the enrichment plugin below. Update it with setContext(). */",
    "const context: { page_type: PageType; logged_in: boolean } = { page_type: 'home', logged_in: false };",
    "",
    "/**",
    " * Call once, as early as possible on every page (e.g. in the root layout).",
    " * Autocapture keeps Amplitude's automatic page views, clicks, form events and web vitals.",
    " */",
    "export function initAnalytics(apiKey: string, opts: { debug?: boolean } = {}) {",
    "  amplitude.add({",
    "    name: 'takshila-context',",
    "    type: 'enrichment',",
    "    execute: async (event) => {",
    "      event.event_properties = { ...context, ...(event.event_properties ?? {}) };",
    "      return event;",
    "    },",
    "  });",
    "  amplitude.init(apiKey, {",
    "    autocapture: { pageViews: false, sessions: true, formInteractions: true, fileDownloads: true, elementInteractions: true },",
    "    logLevel: opts.debug ? amplitude.Types.LogLevel.Debug : amplitude.Types.LogLevel.Warn,",
    "  });",
    "}",
    "",
    "/** Call on every route change, before firing page_view. */",
    "export function setContext(next: Partial<typeof context>) {",
    "  Object.assign(context, next);",
    "}",
    "",
    "export type UserProperties = {",
    fields([{**p, "required": False} for p in spec["user_properties"]]),
    "};",
    "",
    "/** Call on sign-up and on login, with your own user id (never the email). */",
    "export function identifyUser(userId: string, props: Partial<UserProperties> = {}) {",
    "  amplitude.setUserId(userId);",
    "  const id = new amplitude.Identify();",
    "  for (const [k, v] of Object.entries(props)) if (v !== undefined) id.set(k, v as string | number | boolean);",
    "  amplitude.identify(id);",
    "  setContext({ logged_in: true });",
    "}",
    "",
    "/** Call on logout so the next person on this device is a new anonymous user. */",
    "export function resetUser() {",
    "  amplitude.reset();",
    "  setContext({ logged_in: false });",
    "}",
    "",
    "/* ------------------------------------------------------------------ */",
    "/* Events: one typed function per event in the spec                    */",
    "/* ------------------------------------------------------------------ */",
    "",
]

SERVER = {"order_completed", "payment_failed", "cad_approved"}
server_events = [ev for ev in spec["events"] if ev["name"] in SERVER]

for ev in spec["events"]:
    if ev["name"] in SERVER:
        lines += [f"// {ev['name']}: sent from the server. See analytics/sdk/server.ts.", ""]
        continue
    props = ev["properties"]
    name, typ = ev["name"], pascal(ev["name"]) + "Props"
    doc = [f"/**", f" * **{ev['priority']}** · {ev['category']} · {ev['page']}", f" * Fires when: {ev['trigger']}"]
    if ev.get("status") == "existing":
        doc.append(" * Already sent by the current site: keep the same name.")
    doc.append(" */")
    if props:
        lines.append(f"export type {typ} = {{\n{fields(props)}\n}};")
        req = any(p.get("required") for p in props)
        arg = f"props: {typ}" if req else f"props: {typ} = {{}}"
        lines += doc + [f"export const {camel(name)} = ({arg}) => amplitude.track('{name}', props);", ""]
    else:
        lines += doc + [f"export const {camel(name)} = () => amplitude.track('{name}');", ""]

lines += [
    "/* ------------------------------------------------------------------ */",
    "/* Deprecated: do not send these on the new site                      */",
    "/* ------------------------------------------------------------------ */",
]
lines += [f"// {d['name']}: {d['reason']}" for d in spec["deprecated"]]
srv = [
    "// GENERATED FILE. Do not edit by hand.",
    "// Source: analytics/new-site-events.json  ·  Regenerate: python3 analytics/build_tracking_sdk.py",
    "// Server-side events: send these from the backend (payment webhook, CAD approval handler),",
    "// never from the browser, so ad blockers and closed tabs cannot lose them.",
    "",
    "import * as amplitude from '@amplitude/analytics-node';",
    "",
    "let ready = false;",
    "/** Call once at server start-up with the same project's API key. */",
    "export function initServerAnalytics(apiKey: string) {",
    "  amplitude.init(apiKey, { flushIntervalMillis: 1000 });",
    "  ready = true;",
    "}",
    "",
    "/** Who the event belongs to. Pass device_id too when you have it, so web and server events join up. */",
    "export type Actor = { user_id: string; device_id?: string };",
    "",
    "function send(eventType: string, actor: Actor, props: object, extra: Partial<amplitude.Types.EventOptions> = {}) {",
    "  if (!ready) throw new Error('initServerAnalytics() has not been called');",
    "  return amplitude.track(eventType, props as Record<string, unknown>, { ...actor, ...extra }).promise;",
    "}",
    "",
]
for ev in server_events:
    typ = pascal(ev["name"]) + "Props"
    srv.append(f"export type {typ} = {{\n{fields(ev['properties'])}\n}};")
    srv += ["/**", f" * **{ev['priority']}** · Fires when: {ev['trigger']}", " */"]
    if ev["name"] == "order_completed":
        srv += [
            "export function orderCompleted(actor: Actor, props: OrderCompletedProps) {",
            "  // insert_id = order_id makes retries of the same webhook count once.",
            "  // revenue/price/quantity make the order show up in Amplitude revenue charts.",
            "  return send('order_completed', actor, props, {",
            "    insert_id: `order_completed:${props.order_id}`,",
            "    revenue: props.revenue,",
            "    price: props.revenue,",
            "    quantity: 1,",
            "    revenueType: 'purchase',",
            "  });",
            "}",
            "",
            "/** Call right after orderCompleted with the user's new totals from your database. */",
            "export function updateCustomerTotals(actor: Actor, totals: { orders_count: number; lifetime_revenue: number; country?: string }) {",
            "  const id = new amplitude.Identify();",
            "  id.set('orders_count', totals.orders_count).set('lifetime_revenue', totals.lifetime_revenue);",
            "  if (totals.country) id.set('country', totals.country);",
            "  return amplitude.identify(id, actor).promise;",
            "}",
            "",
        ]
    else:
        srv += [f"export const {camel(ev['name'])} = (actor: Actor, props: {typ}) => send('{ev['name']}', actor, props);", ""]
srv += [
    "/** Mark staff and test accounts so dashboards can exclude them. Call when the account is created or its role changes. */",
    "export function setInternal(actor: Actor, isInternal: boolean) {",
    "  return amplitude.identify(new amplitude.Identify().set('is_internal', isInternal), actor).promise;",
    "}",
    "",
    "/** Call before the process exits (and at the end of serverless handlers). */",
    "export const flushAnalytics = () => amplitude.flush().promise;",
]
OUT.parent.mkdir(exist_ok=True)
(OUT.parent / "server.ts").write_text("\n".join(srv) + "\n")
OUT.write_text("\n".join(lines) + "\n")
# ---------------- Laravel: app/Analytics/ServerEvents.php ----------------
PHPT = {"string": "string", "number": "int|float", "boolean": "bool"}


def php_param(p):
    t = PHPT[p["type"]] if not p.get("enum") else "string"
    return f"{t} ${camel(p['name'])}" if p.get("required") else f"{t}|null ${camel(p['name'])} = null"


php = [
    "<?php",
    "",
    "// GENERATED FILE. Do not edit by hand.",
    "// Source: analytics/new-site-events.json  ·  Regenerate: python3 analytics/build_tracking_sdk.py",
    "",
    "namespace App\\Analytics;",
    "",
    "/**",
    " * Server-side Takshila events. Inject this class (or resolve it with app(ServerEvents::class))",
    " * and call it from the payment webhook, the CAD approval handler and account creation.",
    " * Everything is queued; nothing here blocks the request.",
    " */",
    "class ServerEvents",
    "{",
    "    public function __construct(private Amplitude $amplitude) {}",
    "",
]
for ev in server_events:
    ps = sorted(ev["properties"], key=lambda p: not p.get("required"))
    params = ",\n        ".join(["Actor $actor"] + [php_param(p) for p in ps])
    props = "\n".join(f"            '{p['name']}' => ${camel(p['name'])}," for p in ev["properties"])
    checks = []
    for p in ev["properties"]:
        if p.get("enum"):
            vals = ", ".join(f"'{v}'" for v in p["enum"])
            checks.append(f"        if (${camel(p['name'])} !== null && ! in_array(${camel(p['name'])}, [{vals}], true)) {{\n            throw new \\InvalidArgumentException('{p['name']} must be one of: {', '.join(p['enum'])}');\n        }}")
    php += ["    /**", f"     * **{ev['priority']}** · {ev['trigger']}"]
    php += [f"     * @param {PHPT[p['type']] if not p.get('enum') else 'string'} ${camel(p['name'])} {p.get('desc', '')}".rstrip() for p in ps if p.get("desc")]
    php += ["     */", f"    public function {camel(ev['name'])}(\n        {params},\n    ): void {{"]
    php += checks
    if ev["name"] == "order_completed":
        php += [
            f"        $this->amplitude->track('{ev['name']}', $actor, [\n{props}\n        ], [",
            "            // Same order id = same event: a webhook delivered twice is counted once.",
            "            'insert_id' => 'order_completed:'.$orderId,",
            "            // Top-level revenue fields make the order appear in Amplitude revenue charts.",
            "            'revenue' => $revenue,",
            "            'price' => $revenue,",
            "            'quantity' => 1,",
            "            'revenueType' => 'purchase',",
            "        ]);",
            "    }",
            "",
        ]
    else:
        php += [f"        $this->amplitude->track('{ev['name']}', $actor, [\n{props}\n        ]);", "    }", ""]
php += [
    "    /** Call right after orderCompleted with the customer's new totals from the database. */",
    "    public function updateCustomerTotals(Actor $actor, int $ordersCount, int|float $lifetimeRevenue, ?string $country = null): void",
    "    {",
    "        $this->amplitude->identify($actor, [",
    "            'orders_count' => $ordersCount,",
    "            'lifetime_revenue' => $lifetimeRevenue,",
    "            'country' => $country,",
    "        ]);",
    "    }",
    "",
    "    /** Flag staff and test accounts so dashboards can exclude them. */",
    "    public function setInternal(Actor $actor, bool $isInternal): void",
    "    {",
    "        $this->amplitude->identify($actor, ['is_internal' => $isInternal]);",
    "    }",
    "}",
]
lp = HERE / "sdk" / "laravel" / "app" / "Analytics" / "ServerEvents.php"
lp.parent.mkdir(parents=True, exist_ok=True)
lp.write_text("\n".join(php) + "\n")

print(f"wrote {OUT.relative_to(HERE.parent)} ({len(spec['events']) - len(server_events)} browser events) sdk/server.ts and sdk/laravel/.../ServerEvents.php ({len(server_events)} server events)")
