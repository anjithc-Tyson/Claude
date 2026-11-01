"""Generate NEW_SITE_EVENTS.md from new-site-events.json (the single source of truth).

Usage: python3 analytics/build_spec.py
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
spec = json.loads((HERE / "new-site-events.json").read_text())
m = spec["meta"]
STATUS = {"new": "New", "existing": "Keep (already live)", "existing_planned": "Already in the plan"}

def props_table(props):
    if not props:
        return "_No event-specific properties._\n"
    rows = ["| Property | Type | Req. | Notes |", "|---|---|---|---|"]
    for p in props:
        notes = p.get("desc", "")
        if p.get("enum"):
            notes = (notes + " " if notes else "") + "One of: " + ", ".join(f"`{v}`" for v in p["enum"])
        rows.append(f"| `{p['name']}` | {p['type']} | {'✓' if p.get('required') else ''} | {notes} |")
    return "\n".join(rows) + "\n"

out = [f"# {m['title']}", "",
       f"Based on the design at {m['design_source']}. Generated from `new-site-events.json`: edit that file, then run `python3 analytics/build_spec.py`.",
       f"These events are also on the **`{m['amplitude_branch']}`** branch of the Amplitude tracking plan (project {m['amplitude_project']}).", "",
       f"**Naming:** {m['naming']}", "", "## Priorities", ""]
out += [f"- **{k}**: {v}" for k, v in m["priorities"].items()]

events = spec["events"]
out += ["", "## Funnels these events power", "",
        "- **Design Studio:** `studio_opened` → `design_prompt_submitted` → `design_batch_generated` → `design_direction_chosen` → `design_version_created` → `design_finalize_started` → `buy_now_clicked` (studio) → `checkout_started` → `payment_started` → `order_completed` → `cad_approved`",
        "- **Shop:** `product_list_viewed` → `product_clicked` → `product_viewed` → `product_option_selected` → `cart_item_added` / `buy_now_clicked` → `checkout_started` → `checkout_step_completed` → `payment_started` → `order_completed`",
        "- **Community → studio:** `community_feed_viewed` → `community_post_opened` → `community_design_customised` → `studio_opened` → …",
        "- **Supply side:** `designer_cta_clicked` → `studio_opened` (designer mode) → `designer_design_published`", "",
        "**Key events** (mark in Amplitude): `order_completed`, `checkout_started`, `design_prompt_submitted`, `design_direction_chosen`, `cad_approved`, `sign_up`, `newsletter_signed_up`.", "",
        "## Summary", "", "| Event | Area | Priority | Status |", "|---|---|---|---|"]
for e in sorted(events, key=lambda e: (e["priority"], e["category"])):
    out.append(f"| [`{e['name']}`](#{e['name']}) | {e['category']} | {e['priority']} | {STATUS[e['status']]} |")
counts = {p: sum(e["priority"] == p for e in events) for p in ("P0", "P1", "P2")}
out += ["", f"{len(events)} events: {counts['P0']} P0, {counts['P1']} P1, {counts['P2']} P2.", "",
        "## User properties", "", "Set with `identify()`.", "", props_table(spec["user_properties"]),
        "## Properties on every event", "", props_table(spec["global_event_properties"])]

cats = []
for e in events:
    if e["category"] not in cats:
        cats.append(e["category"])
for c in cats:
    out += [f"## {c}", ""]
    for e in (x for x in events if x["category"] == c):
        out += [f"### `{e['name']}`", "",
                f"**{e['priority']}** · {STATUS[e['status']]} · {e['page']}", "",
                f"**Fires when:** {e['trigger']}", "", props_table(e["properties"])]

out += ["## Deprecated on the new site", "", "Stop sending these when the new site launches.", "",
        "| Event | Why |", "|---|---|"]
out += [f"| `{d['name']}` | {d['reason']} |" for d in spec["deprecated"]]
out += ["", "## Implementation notes", "",
        "- Call `amplitude.setUserId()` on sign-up and login, and `reset()` on logout, so anonymous browsing merges into the account.",
        "- Send `order_completed`, `payment_failed`, `cad_approved` and the `orders_count` / `lifetime_revenue` user properties from the **server**. Ad blockers and closed tabs will otherwise lose revenue.",
        "- Never send prompt text, email addresses, names, phone numbers or street addresses as properties.",
        "- Set `is_internal = true` on every staff and test account from day one, so dashboards can exclude internal traffic.",
        "- `design_id` must be stable from the first prompt through checkout and order, so the studio funnel can be joined to revenue.",
        "- Keep Amplitude autocapture (page views, clicks, session replay) on. These events add the business meaning on top.", ""]
(HERE / "NEW_SITE_EVENTS.md").write_text("\n".join(out))
print(f"wrote NEW_SITE_EVENTS.md: {len(events)} events, {counts}")
