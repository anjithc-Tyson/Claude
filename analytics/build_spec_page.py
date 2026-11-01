"""Generate new-site-events.html (shareable spec page) from new-site-events.json.

Usage: python3 analytics/build_spec_page.py
"""
import json
from html import escape as e
from pathlib import Path

HERE = Path(__file__).parent
spec = json.loads((HERE / "new-site-events.json").read_text())
m, events = spec["meta"], spec["events"]
STATUS = {"new": "New", "existing": "Live today", "existing_planned": "In plan"}
counts = {p: sum(x["priority"] == p for x in events) for p in ("P0", "P1", "P2")}
cats = []
for x in events:
    if x["category"] not in cats:
        cats.append(x["category"])
slug = lambda s: "".join(c if c.isalnum() else "-" for c in s.lower()).strip("-")


def props(rows, empty="No event-specific properties."):
    if not rows:
        return f'<p class="none">{empty}</p>'
    out = ['<div class="tw"><table><thead><tr><th>Property</th><th>Type</th><th>Notes</th></tr></thead><tbody>']
    for p in rows:
        notes = e(p.get("desc", ""))
        if p.get("enum"):
            notes += (" " if notes else "") + '<span class="vals">' + " ".join(f"<code>{e(v)}</code>" for v in p["enum"]) + "</span>"
        req = '<span class="req" title="Required">required</span>' if p.get("required") else ""
        out.append(f"<tr><td><code>{e(p['name'])}</code>{req}</td><td class=\"ty\">{e(p['type'])}</td><td>{notes}</td></tr>")
    out.append("</tbody></table></div>")
    return "".join(out)


def event(x):
    hay = " ".join([x["name"], x["trigger"], x["page"], x["category"]] + [p["name"] for p in x["properties"]]).lower()
    return f"""<details class="ev" id="{e(x['name'])}" data-p="{x['priority']}" data-c="{slug(x['category'])}" data-s="{e(hay)}">
<summary><span class="pri {x['priority'].lower()}">{x['priority']}</span><code class="nm">{e(x['name'])}</code><span class="st st-{x['status']}">{STATUS[x['status']]}</span><span class="tr">{e(x['trigger'])}</span></summary>
<div class="body"><dl><div><dt>Fires when</dt><dd>{e(x['trigger'])}</dd></div><div><dt>Where</dt><dd>{e(x['page'])}</dd></div></dl>
<button type="button" class="copy" data-copy="{e(x['name'])}">Copy name</button>{props(x['properties'])}</div></details>"""


sections = []
for c in cats:
    evs = [x for x in events if x["category"] == c]
    sections.append(f'<section class="cat" data-c="{slug(c)}"><h3>{e(c)} <span class="n">{len(evs)}</span></h3>' + "".join(event(x) for x in evs) + "</section>")

funnel = [("Opened studio", "studio_opened"), ("Described the piece", "design_prompt_submitted"), ("Saw 3 directions", "design_batch_generated"),
          ("Chose a direction", "design_direction_chosen"), ("Refined versions", "design_version_created"), ("Finalized materials", "design_finalize_started"),
          ("Bought", "buy_now_clicked"), ("Checkout", "checkout_started"), ("Paid", "order_completed"), ("Approved CAD", "cad_approved")]
funnel_html = "".join(f'<li><a href="#{n}"><span class="fl">{e(l)}</span><code>{n.replace("_", "_<wbr>")}</code></a></li>' for l, n in funnel)
cat_chips = "".join(f'<button type="button" class="chip" data-c="{slug(c)}" aria-pressed="false">{e(c)}</button>' for c in cats)
dep = "".join(f"<tr><td><code>{e(d['name'])}</code></td><td>{e(d['reason'])}</td></tr>" for d in spec["deprecated"])

html = f"""<title>Takshila Event Spec</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* Layout: a reference sheet. Narrow reading column, funnel strip, sticky filter bar, expandable event rows grouped by product area. */
:root {{
  --bg:#FBF9FA; --surface:#FFFFFF; --fg:#241A22; --muted:#6E6169; --line:#E7DFE4;
  --plum:#6B1E3A; --gold:#9A6A22; --gold-soft:#F4EAD8; --p0:#9E2A3F; --p1:#9A6A22; --p2:#6E6169;
  --code-bg:#F3EEF1;
  --display:"Newsreader", Georgia, "Times New Roman", serif;
  --body:"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono:"IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{
  --bg:#161114; --surface:#1F181C; --fg:#F1E9EE; --muted:#A8999F; --line:#352A30;
  --plum:#E39AB2; --gold:#E0B565; --gold-soft:#3A2E1C; --p0:#F08EA2; --p1:#E0B565; --p2:#A8999F; --code-bg:#2A2126; color-scheme:dark }} }}
:root[data-theme="dark"] {{
  --bg:#161114; --surface:#1F181C; --fg:#F1E9EE; --muted:#A8999F; --line:#352A30;
  --plum:#E39AB2; --gold:#E0B565; --gold-soft:#3A2E1C; --p0:#F08EA2; --p1:#E0B565; --p2:#A8999F; --code-bg:#2A2126; color-scheme:dark }}
* {{ box-sizing:border-box }}
body {{ background:var(--bg); color:var(--fg); font:15px/1.6 var(--body);
  padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px)) }}
.wrap {{ max-width:960px; margin:0 auto; padding-block:48px 80px; display:grid; gap:48px }}
h1,h2,h3 {{ font-family:var(--display); font-weight:600; text-wrap:balance; margin:0; letter-spacing:-.01em }}
h1 {{ font-size:clamp(34px,5vw,48px); line-height:1.05 }}
h2 {{ font-size:26px }}
h3 {{ font-size:21px; display:flex; align-items:baseline; gap:10px }}
.eyebrow {{ font:500 12px var(--body); letter-spacing:.12em; text-transform:uppercase; color:var(--gold); margin:0 0 12px }}
p {{ margin:0 }}
a {{ color:var(--plum) }}
code {{ font:13px var(--mono); background:var(--code-bg); padding:1px 5px; border-radius:4px; overflow-wrap:anywhere }}
header {{ display:grid; gap:16px }}
.lede {{ font-size:17px; color:var(--muted); max-width:62ch }}
.meta {{ display:flex; flex-wrap:wrap; gap:8px 24px; font-size:13px; color:var(--muted) }}
.meta b {{ color:var(--fg); font-weight:600 }}
.stats {{ display:flex; flex-wrap:wrap; gap:12px }}
.stat {{ display:flex; align-items:baseline; gap:8px; padding:8px 14px; border:1px solid var(--line); border-radius:8px; background:var(--surface); font-variant-numeric:tabular-nums }}
.stat b {{ font:600 22px var(--display) }}
.stat span {{ font-size:13px; color:var(--muted) }}
.sec {{ display:grid; gap:16px }}
.sec > p {{ color:var(--muted); max-width:66ch }}
/* funnel: a real sequence, so numbered */
.funnel {{ list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:8px; counter-reset:f }}
.funnel li {{ counter-increment:f; min-width:0 }}
.funnel a {{ display:grid; gap:4px; height:100%; padding:12px 14px; border:1px solid var(--line); border-radius:8px; background:var(--surface); text-decoration:none; color:var(--fg) }}
.funnel a:hover {{ border-color:var(--gold) }}
.funnel .fl::before {{ content:counter(f) "  "; font:500 12px var(--mono); color:var(--gold) }}
.funnel .fl {{ font-weight:500; font-size:14px }}
.funnel code {{ background:none; padding:0; font-size:12px; color:var(--muted); overflow-wrap:normal }}
.rules {{ margin:0; padding-left:20px; display:grid; gap:8px; max-width:70ch }}
.steps {{ list-style:none; margin:0; padding:0; display:grid; gap:20px; counter-reset:s }}
.steps > li {{ counter-increment:s; display:grid; grid-template-columns:32px 1fr; gap:4px 14px }}
.steps > li::before {{ content:counter(s); grid-row:span 3; width:28px; height:28px; border-radius:50%; border:1px solid var(--gold); color:var(--gold); font:500 13px var(--mono); display:grid; place-items:center }}
.steps h4 {{ margin:2px 0 0; font:600 16px var(--body) }}
.steps p {{ color:var(--muted); max-width:66ch; min-width:0 }}
pre {{ margin:6px 0 0; padding:12px 14px; background:var(--code-bg); border-radius:8px; overflow-x:auto; font:13px/1.55 var(--mono); min-width:0 }}
pre code {{ background:none; padding:0; overflow-wrap:normal }}
/* filter bar */
.bar {{ position:sticky; top:env(safe-area-inset-top, 0px); z-index:5; background:var(--bg); padding-block:12px; border-bottom:1px solid var(--line); display:grid; gap:10px }}
body::before {{ content:""; position:fixed; inset:0 0 auto; height:env(safe-area-inset-top, 0px); z-index:10; background:var(--bg) }}
.bar input {{ width:100%; font:15px var(--body); color:var(--fg); background:var(--surface); border:1px solid var(--line); border-radius:8px; padding:10px 12px }}
.bar input:focus-visible, button:focus-visible, summary:focus-visible, a:focus-visible {{ outline:2px solid var(--gold); outline-offset:2px }}
.chips {{ display:flex; flex-wrap:wrap; gap:6px; align-items:center }}
.chips .lbl {{ font-size:12px; color:var(--muted); letter-spacing:.06em; text-transform:uppercase; margin-right:4px }}
.chip {{ font:500 13px var(--body); color:var(--fg); background:var(--surface); border:1px solid var(--line); border-radius:999px; padding:4px 12px; cursor:pointer }}
.chip[aria-pressed="true"] {{ background:var(--fg); color:var(--bg); border-color:var(--fg) }}
.count {{ font-size:13px; color:var(--muted); font-variant-numeric:tabular-nums }}
/* events */
.cat {{ display:grid; gap:6px }}
.cat h3 {{ margin:28px 0 8px }}
.cat h3 .n {{ font:500 13px var(--mono); color:var(--muted) }}
.ev {{ border:1px solid var(--line); border-radius:8px; background:var(--surface) }}
.ev[open] {{ border-color:var(--gold) }}
summary {{ list-style:none; cursor:pointer; display:grid; grid-template-columns:auto auto 1fr; align-items:center; gap:4px 12px; padding:12px 14px }}
summary::-webkit-details-marker {{ display:none }}
summary .nm {{ background:none; padding:0; font-size:14px; font-weight:500 }}
summary .st {{ justify-self:end; font-size:12px; color:var(--muted); white-space:nowrap }}
summary .st-new {{ color:var(--gold) }}
summary .tr {{ grid-column:2 / -1; color:var(--muted); font-size:14px; min-width:0 }}
.ev[open] summary .tr {{ display:none }}
.pri {{ font:600 11px var(--mono); letter-spacing:.04em; padding:2px 7px; border-radius:4px; border:1px solid currentColor }}
.pri.p0 {{ color:var(--p0) }} .pri.p1 {{ color:var(--p1) }} .pri.p2 {{ color:var(--p2) }}
.body {{ padding:0 14px 16px; display:grid; gap:12px; min-width:0 }}
dl {{ margin:0; display:grid; gap:6px }}
dl div {{ display:grid; grid-template-columns:110px 1fr; gap:12px }}
dt {{ font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); padding-top:2px }}
dd {{ margin:0; min-width:0 }}
.copy {{ justify-self:start; font:500 12px var(--body); color:var(--plum); background:none; border:1px solid var(--line); border-radius:6px; padding:4px 10px; cursor:pointer }}
.tw {{ overflow-x:auto }}
table {{ width:100%; border-collapse:collapse; font-size:14px }}
th {{ text-align:left; font:500 12px var(--body); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); border-bottom:1px solid var(--line); padding:6px 10px 6px 0 }}
td {{ border-bottom:1px solid var(--line); padding:8px 10px 8px 0; vertical-align:top }}
td.ty {{ font:13px var(--mono); color:var(--muted); white-space:nowrap }}
.req {{ display:inline-block; margin-left:6px; font-size:11px; color:var(--p0); letter-spacing:.04em }}
.vals {{ display:flex; flex-wrap:wrap; gap:4px; margin-top:4px }}
.vals code {{ font-size:12px }}
.none {{ color:var(--muted); font-size:14px }}
.empty {{ color:var(--muted); padding:24px 0 }}
footer {{ color:var(--muted); font-size:13px; border-top:1px solid var(--line); padding-top:20px }}
@media (max-width:560px) {{
  summary {{ grid-template-columns:auto 1fr }}
  summary .st {{ grid-column:2; justify-self:start }}
  summary .tr {{ grid-column:1 / -1 }}
  dl div {{ grid-template-columns:1fr; gap:2px }}
}}
@media (prefers-reduced-motion:reduce) {{ * {{ scroll-behavior:auto !important }} }}
</style>

<div class="wrap">
<header>
  <p class="eyebrow">Analytics · Amplitude</p>
  <h1>Takshila event spec for the new site</h1>
  <p class="lede">Every event the new takshila.co should send to Amplitude, with when it fires and what it carries. Built from the Framer design; ship the P0 events before launch.</p>
  <div class="meta"><span>Design <a href="{e(m['design_source'])}">{e(m['design_source'].replace('https://',''))}</a></span><span>Amplitude project <b>{e(m['amplitude_project'])}</b>, branch <b>{e(m['amplitude_branch'])}</b></span><span>Updated Nov 1, 2026</span></div>
  <div class="stats"><div class="stat"><b>{len(events)}</b><span>events</span></div><div class="stat"><b>{counts['P0']}</b><span>P0 · launch</span></div><div class="stat"><b>{counts['P1']}</b><span>P1</span></div><div class="stat"><b>{counts['P2']}</b><span>P2</span></div></div>
</header>

<section class="sec">
  <h2>The funnel that matters most</h2>
  <p>From a first idea in the Design Studio to an approved CAD. Each step is one event; together they show where people drop out and what they buy.</p>
  <ol class="funnel">{funnel_html}</ol>
</section>

<section class="sec">
  <h2>Rules for developers</h2>
  <ul class="rules">
    <li>Names are snake_case, <code>object_action</code> in the past tense. Prices are numbers in major units (<code>620</code>, not <code>62000</code>) with a separate <code>currency</code>.</li>
    <li>Send <code>order_completed</code>, <code>payment_failed</code> and <code>cad_approved</code> from the server, so ad blockers and closed tabs can't lose revenue.</li>
    <li>Keep one <code>design_id</code> from the first prompt through checkout and order, so studio activity joins to revenue.</li>
    <li>Call <code>setUserId()</code> on sign-up and login and <code>reset()</code> on logout. Set <code>is_internal</code> on every staff and test account.</li>
    <li>Never send prompt text, emails, names, phone numbers or addresses as properties.</li>
    <li>Send <code>page_type</code> and <code>logged_in</code> on every event.</li>
  </ul>
</section>

<section class="sec" id="build">
  <h2>How to build it</h2>
  <p>The events are generated as typed functions, one per event, from the same file as this page. A misspelled event name or a missing property fails to compile. The full guide with every code sample is <code>analytics/IMPLEMENTATION.md</code> in the repo.</p>
  <ol class="steps">
    <li><h4>Get the API keys</h4><p>Amplitude → Settings → Projects → <b>default (814554)</b> for production. Create a second <b>Takshila (dev)</b> project for local and staging builds, so test traffic never mixes with real data.</p></li>
    <li><h4>Install the SDKs and copy the generated files</h4><p>Copy <code>analytics/sdk/tracking.ts</code> (browser) and <code>analytics/sdk/server.ts</code> (backend) into the codebase. Don't edit them by hand: regenerate with <code>python3 analytics/build_tracking_sdk.py</code>.</p><pre><code>npm install @amplitude/analytics-browser @amplitude/analytics-node</code></pre></li>
    <li><h4>Initialise once, and track every route change</h4><p>In the root layout. <code>page_type</code> and <code>logged_in</code> are then added to every event automatically.</p><pre><code>initAnalytics(process.env.NEXT_PUBLIC_AMPLITUDE_KEY, {{ debug: isDev }});

// on every route change
setContext({{ page_type: 'product' }});
pageView({{ page_path: location.pathname, page_title: document.title }});</code></pre></li>
    <li><h4>Identify users on sign-up and login</h4><p>Use your own user id, never the email. This merges the visitor's anonymous history into their account.</p><pre><code>identifyUser(user.id, {{ user_role: 'buyer' }});
signUp({{ method: 'google', trigger_point: 'studio_save' }});
// on logout
resetUser();</code></pre></li>
    <li><h4>Call one function where each action happens</h4><p>Fire it in the handler, after the action succeeds. Keep one <code>design_id</code> from the first prompt to the order.</p><pre><code>track.designPromptSubmitted({{ design_id, prompt_length: prompt.length,
  has_reference_image: !!file, source: 'typed', location: 'studio' }});
track.designDirectionChosen({{ design_id, direction: 'signature', batch_number: 1 }});
track.buyNowClicked({{ context: 'studio_finalize', product_id: design_id,
  price: 2313, currency: 'USD' }});</code></pre></li>
    <li><h4>Send revenue from the server</h4><p><code>order_completed</code>, <code>payment_failed</code> and <code>cad_approved</code> live only in <code>server.ts</code>. Call them from the payment webhook and the CAD approval handler. The order id is used as the insert id, so a repeated webhook is counted once.</p><pre><code>await orderCompleted({{ user_id, device_id }}, {{
  order_id: order.id, revenue: order.total, currency: 'USD' }});
await setInternal({{ user_id }}, email.endsWith('@takshila.co'));</code></pre></li>
    <li><h4>Respect consent in the EU and UK</h4><p>Call <code>amplitude.setOptOut(true)</code> before initialising, and <code>setOptOut(false)</code> once the visitor accepts the cookie banner.</p></li>
    <li><h4>Test with the dev project</h4><p>Run with <code>debug: true</code>, then open User Lookup in Amplitude and watch your test user's event stream live. Walk every P0 flow end to end. Anything Amplitude marks <i>unexpected</i> is a code mistake to fix.</p></li>
    <li><h4>Launch</h4><p>Merge the <b>new-site</b> tracking-plan branch into main, mark the key events, stop sending the deprecated events below, and switch to the production key.</p></li>
  </ol>
</section>

<section class="sec" id="events">
  <h2>Events</h2>
  <div class="bar">
    <label for="q" class="lbl" hidden>Search events</label>
    <input id="q" type="search" placeholder="Search events, properties or pages, e.g. checkout, design_id, /community" autocomplete="off">
    <div class="chips"><span class="lbl">Priority</span>
      <button type="button" class="chip" data-p="P0" aria-pressed="false">P0</button><button type="button" class="chip" data-p="P1" aria-pressed="false">P1</button><button type="button" class="chip" data-p="P2" aria-pressed="false">P2</button></div>
    <div class="chips"><span class="lbl">Area</span>{cat_chips}</div>
    <span class="count" id="count">{len(events)} events</span>
  </div>
  <div id="list">{''.join(sections)}<p class="empty" id="empty" hidden>No events match. Clear the search or filters.</p></div>
</section>

<section class="sec" id="user-properties">
  <h2>User properties</h2>
  <p>Set with <code>identify()</code>. <code>is_internal</code> is what lets dashboards exclude staff and test traffic.</p>
  {props(spec['user_properties'])}
</section>

<section class="sec">
  <h2>Properties on every event</h2>
  {props(spec['global_event_properties'])}
</section>

<section class="sec" id="deprecated">
  <h2>Stop sending at launch</h2>
  <p>These events exist on the current site but don't fit the new design.</p>
  <div class="tw"><table><thead><tr><th>Event</th><th>Why</th></tr></thead><tbody>{dep}</tbody></table></div>
</section>

<footer>Source of truth: <code>analytics/new-site-events.json</code> in the <code>anjithc-tyson/claude</code> repo. The same events are on the <b>{e(m['amplitude_branch'])}</b> branch of the Amplitude tracking plan; merge it into main when the new site launches.</footer>
</div>

<script>
(function () {{
  var q = document.getElementById('q'), count = document.getElementById('count'), empty = document.getElementById('empty');
  var evs = Array.prototype.slice.call(document.querySelectorAll('.ev'));
  var cats = Array.prototype.slice.call(document.querySelectorAll('.cat'));
  var pOn = {{}}, cOn = {{}};
  function apply() {{
    var t = q.value.trim().toLowerCase(), anyP = Object.keys(pOn).length, anyC = Object.keys(cOn).length, n = 0;
    evs.forEach(function (el) {{
      var ok = (!t || el.dataset.s.indexOf(t) > -1) && (!anyP || pOn[el.dataset.p]) && (!anyC || cOn[el.dataset.c]);
      el.hidden = !ok; if (ok) n++;
      if (t && ok && t.length > 2 && el.id.indexOf(t) > -1) el.open = true;
    }});
    cats.forEach(function (c) {{ c.hidden = !c.querySelector('.ev:not([hidden])'); }});
    count.textContent = n + (n === 1 ? ' event' : ' events');
    empty.hidden = n > 0;
  }}
  q.addEventListener('input', apply);
  document.querySelectorAll('.chip').forEach(function (b) {{
    b.addEventListener('click', function () {{
      var on = b.getAttribute('aria-pressed') !== 'true', set = b.dataset.p ? pOn : cOn, k = b.dataset.p || b.dataset.c;
      b.setAttribute('aria-pressed', String(on)); if (on) set[k] = 1; else delete set[k]; apply();
    }});
  }});
  document.querySelectorAll('.copy').forEach(function (b) {{
    b.addEventListener('click', function () {{
      var name = b.dataset.copy, done = function () {{ b.textContent = 'Copied'; setTimeout(function () {{ b.textContent = 'Copy name'; }}, 1400); }};
      try {{ navigator.clipboard.writeText(name).then(done, function () {{ sel(b); }}); }} catch (err) {{ sel(b); }}
    }});
  }});
  function sel(b) {{ var c = b.closest('.ev').querySelector('.nm'); var r = document.createRange(); r.selectNodeContents(c); var s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Selected, press Ctrl+C'; }}
  function openHash() {{ var h = location.hash.slice(1), el = h && document.getElementById(h); if (el && el.tagName === 'DETAILS') {{ el.open = true; el.scrollIntoView(); }} }}
  window.addEventListener('hashchange', openHash); openHash();
}})();
</script>
"""
(HERE / "new-site-events.html").write_text(html)
print("wrote new-site-events.html", len(html), "bytes")
