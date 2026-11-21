/**
 * Takshila Team Hub — the engine behind the Framer dashboard. No Claude involved.
 *
 *  - Data lives in a Google Sheet (tabs: Team, Attendance, Settings).
 *  - Tasks come from Linear's API (needs a Linear API key in Script Properties).
 *  - Monday and Friday emails go out from the Gmail account that deployed this script.
 *  - A daily check after the stand-up reads Google Calendar and the Meet attendance report.
 *  - doGet / doPost give the Framer components a JSON API. People sign in with their work email + a one-time code.
 *
 * Setup steps are in team-hub/README.md.
 */

/* ============================== CONFIG ============================== */

const CFG = {
  TZ_WORK: 'America/New_York',   // dates in emails follow the team's US working day (never printed)
  TZ_LOCAL: 'Asia/Kolkata',      // stand-up start time and trigger times
  LINEAR_API: 'https://api.linear.app/graphql',
  LINEAR_WEB: 'https://linear.app/team-takshila',
  SCOPE_PROJECTS: ['Design', 'SEO'],   // email scope: these Linear projects...
  SCOPE_LABELS: ['Design', 'SEO'],     // ...or these labels...
  // ...or anything assigned to the Team-sheet person whose "id" is in Settings → scopeOwner, or their reports.
  SENDER_NAME: 'Takshila Design & SEO',
  KEEP_DONE_DAYS: 90,
  CACHE_SECONDS: 300,
  MEET_SENDER: 'meetings-noreply@google.com'
};

const TEAM_HEADERS = ['id', 'name', 'email', 'linearEmail', 'title', 'level', 'reportsTo', 'getsEmail', 'inReports'];
const ATT_HEADERS = ['date', 'personId', 'status', 'minsLate', 'joinedAt', 'source', 'updated'];
const DEFAULT_SETTINGS = {
  meeting: 'Daily stand-up',
  calendarTitle: 'Stand Up',     // part of the Google Calendar event title to look for
  start: '21:00',                // India time, 24h
  grace: '2',                    // minutes
  days: '1,2,3,4,5',             // 0=Sun … 6=Sat
  attendees: '',                 // comma-separated Team ids; empty = everyone with inReports on
  scopeOwner: '',                // Team id of the Design & SEO lead
  dashboardUrl: ''               // link printed at the bottom of every email
};

/* ============================== SETUP ============================== */

/** Run once from the editor: creates the Sheet tabs, default settings and an access key. */
function setup() {
  const props = PropertiesService.getScriptProperties();
  let ss;
  const id = props.getProperty('SHEET_ID');
  if (id) ss = SpreadsheetApp.openById(id);
  else {
    ss = SpreadsheetApp.create('Takshila Team Hub');
    props.setProperty('SHEET_ID', ss.getId());
  }
  ensureSheet_(ss, 'Team', TEAM_HEADERS);
  ensureSheet_(ss, 'Attendance', ATT_HEADERS);
  const st = ensureSheet_(ss, 'Settings', ['key', 'value']);
  const have = st.getDataRange().getValues().map(r => r[0]);
  Object.keys(DEFAULT_SETTINGS).forEach(k => { if (have.indexOf(k) < 0) st.appendRow([k, DEFAULT_SETTINGS[k]]); });
  const first = ss.getSheetByName('Sheet1'); if (first && ss.getSheets().length > 3) ss.deleteSheet(first);
  if (!props.getProperty('ACCESS_KEY')) props.setProperty('ACCESS_KEY', Utilities.getUuid().replace(/-/g, ''));
  Logger.log('Sheet: ' + ss.getUrl());
  Logger.log('Admin access key (keep private, not for Framer): ' + props.getProperty('ACCESS_KEY'));
  Logger.log('Next: add LINEAR_API_KEY in Project Settings → Script properties, fill the Team tab, then run installTriggers.');
}

/** Run once after setup: creates the Monday, Friday and daily attendance schedules (India time). */
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sendMonday').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(20).nearMinute(45).inTimezone(CFG.TZ_LOCAL).create();
  ScriptApp.newTrigger('sendFriday').timeBased().onWeekDay(ScriptApp.WeekDay.SATURDAY).atHour(0).nearMinute(5).inTimezone(CFG.TZ_LOCAL).create();
  ScriptApp.newTrigger('attendanceCheck').timeBased().everyDays(1).atHour(22).nearMinute(20).inTimezone(CFG.TZ_LOCAL).create();
  Logger.log('Triggers installed: Monday ~8:45 PM, Saturday ~12:05 AM, daily ~10:20 PM (India time).');
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) { sh.appendRow(headers); sh.setFrozenRows(1); sh.getRange(1, 1, 1, headers.length).setFontWeight('bold'); }
  return sh;
}

/* ============================== SHEET DATA ============================== */

function ss_() { return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID')); }
function bool_(v, dflt) { if (v === '' || v === null || v === undefined) return dflt; return String(v).toLowerCase() === 'true' || v === true || String(v).toLowerCase() === 'yes'; }

function readTeam() {
  const rows = ss_().getSheetByName('Team').getDataRange().getValues();
  const h = rows.shift();
  return rows.filter(r => r[0]).map(r => {
    const o = {}; h.forEach((k, i) => o[k] = r[i]);
    return {
      id: String(o.id), name: String(o.name || o.id), email: String(o.email || '').trim(),
      linearEmail: String(o.linearEmail || '').trim(), title: String(o.title || ''),
      level: ['leadership', 'manager', 'employee'].indexOf(String(o.level).toLowerCase()) >= 0 ? String(o.level).toLowerCase() : 'employee',
      reportsTo: String(o.reportsTo || ''), getsEmail: bool_(o.getsEmail, true), inReports: bool_(o.inReports, true)
    };
  });
}

function writeMember(m) {
  const sh = ss_().getSheetByName('Team');
  const rows = sh.getDataRange().getValues();
  const row = TEAM_HEADERS.map(k => m[k] === undefined ? '' : m[k]);
  for (let i = 1; i < rows.length; i++) if (String(rows[i][0]) === String(m.id)) { sh.getRange(i + 1, 1, 1, row.length).setValues([row]); return; }
  sh.appendRow(row);
}

function removeMember(id) {
  const sh = ss_().getSheetByName('Team');
  const rows = sh.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) if (String(rows[i][0]) === String(id)) sh.deleteRow(i + 1);
}

function readSettings() {
  const out = Object.assign({}, DEFAULT_SETTINGS);
  ss_().getSheetByName('Settings').getDataRange().getValues().slice(1).forEach(r => { if (r[0]) out[r[0]] = String(r[1]); });
  return {
    meeting: out.meeting, calendarTitle: out.calendarTitle, start: normTime_(out.start), grace: Number(out.grace) || 0,
    days: String(out.days).split(',').map(s => Number(s.trim())).filter(n => n >= 0 && n <= 6),
    attendees: String(out.attendees).split(',').map(s => s.trim()).filter(Boolean),
    scopeOwner: out.scopeOwner, dashboardUrl: out.dashboardUrl
  };
}

function writeSetting(key, value) {
  const sh = ss_().getSheetByName('Settings');
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) if (rows[i][0] === key) { sh.getRange(i + 1, 2).setValue(value); return; }
  sh.appendRow([key, value]);
}

function normTime_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, CFG.TZ_LOCAL, 'HH:mm');
  const m = String(v).match(/(\d{1,2}):(\d{2})/); return m ? ('0' + m[1]).slice(-2) + ':' + m[2] : '21:00';
}

/** Attendance as {date: {personId: {status, minsLate, joinedAt, source}}}, last `days` days. */
function readAttendance(days) {
  const since = addDays_(workDay_(), -(days || 120));
  const out = {};
  ss_().getSheetByName('Attendance').getDataRange().getValues().slice(1).forEach(r => {
    const d = r[0] instanceof Date ? Utilities.formatDate(r[0], CFG.TZ_WORK, 'yyyy-MM-dd') : String(r[0]);
    if (!d || d < since) return;
    (out[d] = out[d] || {})[String(r[1])] = { status: String(r[2]), minsLate: r[3] === '' ? null : Number(r[3]), joinedAt: String(r[4] || ''), source: String(r[5] || '') };
  });
  return out;
}

/** Sets (or clears, when status is empty) one person's mark for one date. Manual marks win over automatic ones. */
function setAttendance(date, personId, status, minsLate, joinedAt, source) {
  const sh = ss_().getSheetByName('Attendance');
  const rows = sh.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    const d = rows[i][0] instanceof Date ? Utilities.formatDate(rows[i][0], CFG.TZ_WORK, 'yyyy-MM-dd') : String(rows[i][0]);
    if (d === date && String(rows[i][1]) === String(personId)) {
      if (source !== 'manual' && rows[i][5] === 'manual') return false;   // never overwrite a manual mark
      if (!status) { sh.deleteRow(i + 1); return true; }
      sh.getRange(i + 1, 1, 1, ATT_HEADERS.length).setValues([[date, personId, status, minsLate == null ? '' : minsLate, joinedAt || '', source || 'manual', new Date()]]);
      return true;
    }
  }
  if (status) sh.appendRow([date, personId, status, minsLate == null ? '' : minsLate, joinedAt || '', source || 'manual', new Date()]);
  sh.getRange('A:A').setNumberFormat('@');
  return true;
}

/* ============================== DATES ============================== */

function workDay_() { return Utilities.formatDate(new Date(), CFG.TZ_WORK, 'yyyy-MM-dd'); }
function localDay_() { return Utilities.formatDate(new Date(), CFG.TZ_LOCAL, 'yyyy-MM-dd'); }
function addDays_(s, n) { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function dow_(s) { return new Date(s + 'T12:00:00Z').getUTCDay(); }
function eDate_(s) { return s ? Utilities.formatDate(new Date(s + 'T12:00:00Z'), 'UTC', 'EEE d MMM') : ''; }
function between_(d, a, b) { return !!d && d >= a && d <= b; }
function meetingDays_(from, to, set) { const out = []; for (let d = from; d <= to; d = addDays_(d, 1)) if (set.days.indexOf(dow_(d)) >= 0) out.push(d); return out; }

/* ============================== LINEAR ============================== */

const ISSUE_QUERY = 'query($after:String,$filter:IssueFilter){issues(first:100,after:$after,filter:$filter){' +
  'nodes{identifier title url priority dueDate createdAt completedAt state{name type} labels{nodes{name}} assignee{name email} project{name}}' +
  'pageInfo{hasNextPage endCursor}}}';

function linear_(query, variables) {
  const key = PropertiesService.getScriptProperties().getProperty('LINEAR_API_KEY');
  if (!key) throw new Error('LINEAR_API_KEY is missing from Script Properties.');
  const res = UrlFetchApp.fetch(CFG.LINEAR_API, {
    method: 'post', contentType: 'application/json', headers: { Authorization: key },
    payload: JSON.stringify({ query: query, variables: variables || {} }), muteHttpExceptions: true
  });
  const body = JSON.parse(res.getContentText());
  if (res.getResponseCode() >= 300 || body.errors) throw new Error('Linear error: ' + res.getContentText().slice(0, 300));
  return body.data;
}

/** All open issues plus those completed in the last KEEP_DONE_DAYS days (cached for a few minutes). */
function fetchIssues_(force) {
  const cache = CacheService.getScriptCache();
  if (!force) {
    const n = Number(cache.get('issues_n') || 0);
    if (n) {
      const parts = cache.getAll(Array.from({ length: n }, (_, i) => 'issues_' + i));
      if (Object.keys(parts).length === n) return JSON.parse(Array.from({ length: n }, (_, i) => parts['issues_' + i]).join(''));
    }
  }
  const since = new Date(Date.now() - CFG.KEEP_DONE_DAYS * 864e5).toISOString();
  const filter = { or: [{ state: { type: { nin: ['completed', 'canceled'] } } }, { completedAt: { gt: since } }] };
  let after = null, all = [], guard = 0;
  do {
    const d = linear_(ISSUE_QUERY, { after: after, filter: filter });
    all = all.concat(d.issues.nodes);
    after = d.issues.pageInfo.hasNextPage ? d.issues.pageInfo.endCursor : null;
  } while (after && ++guard < 30);
  const json = JSON.stringify(all), size = 90000, chunks = {};
  for (let i = 0; i * size < json.length; i++) chunks['issues_' + i] = json.slice(i * size, (i + 1) * size);
  try { cache.putAll(chunks, CFG.CACHE_SECONDS); cache.put('issues_n', String(Object.keys(chunks).length), CFG.CACHE_SECONDS); } catch (e) { }
  return all;
}

/** Normalised tasks. People with inReports off are left out entirely. */
function tasks_(team, force) {
  const byEmail = {}, byName = {};
  team.forEach(m => { [m.email, m.linearEmail].forEach(e => { if (e) byEmail[e.toLowerCase()] = m; }); byName[m.name.toLowerCase()] = m; });
  const people = {}, out = [];
  let hidden = 0;
  fetchIssues_(force).forEach(i => {
    if (!i.state || i.state.type === 'canceled') return;
    const a = i.assignee;
    const m = a ? (byEmail[(a.email || '').toLowerCase()] || byName[(a.name || '').toLowerCase()]) : null;
    if (m && !m.inReports) { hidden++; return; }
    let assigneeId = '';
    if (m) assigneeId = m.id;
    else if (a) { assigneeId = 'lin:' + (a.email || a.name); people[assigneeId] = { id: assigneeId, name: a.name && a.name.indexOf('@') < 0 ? a.name : String(a.email || a.name).split('@')[0] }; }
    const labels = (i.labels && i.labels.nodes || []).map(l => l.name);
    const type = i.state.type === 'completed' ? 'done' : (i.state.type === 'triage' ? 'backlog' : i.state.type);
    out.push({
      id: i.identifier, title: i.title, url: i.url, status: type, statusName: i.state.name,
      priority: ['none', 'urgent', 'high', 'medium', 'low'][i.priority] || 'none', due: i.dueDate || '',
      project: i.project ? i.project.name : '', labels: labels, assigneeId: assigneeId,
      createdAt: i.createdAt || '', doneAt: i.completedAt || '',
      blocked: /block/i.test(i.state.name) || labels.some(l => /block/i.test(l))
    });
  });
  return { tasks: out, people: people, hidden: hidden };
}

/* ============================== EMAILS ============================== */

const PRI = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low', none: 'No priority' };
const PRI_ORDER = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
const MUTED = '#72706a', LINE = '#e5e3dd';
const esc_ = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sortT_ = (a, b) => (PRI_ORDER[a.priority] - PRI_ORDER[b.priority]) || (a.due || '9999').localeCompare(b.due || '9999') || a.id.localeCompare(b.id, undefined, { numeric: true });

function below_(team, rootId) {
  const out = {}; out[rootId] = true; let grew = true;
  while (grew) { grew = false; team.forEach(m => { if (m.reportsTo && out[m.reportsTo] && !out[m.id]) { out[m.id] = true; grew = true; } }); }
  return out;
}

function windows_(kind, period, from, to) {
  const td = workDay_(), dw = dow_(td);
  if (period === 'today') return { td: td, a: td, b: td, label: 'Today, ' + eDate_(td), doneA: td, doneB: td };
  if (period === 'range') return { td: td, a: from, b: to, label: eDate_(from) + ' – ' + eDate_(to), doneA: from, doneB: to };
  if (kind === 'ahead') return { td: td, a: td, b: addDays_(td, (7 - dw) % 7), label: 'Week of ' + eDate_(td), doneA: addDays_(td, -6), doneB: td };
  const nm = addDays_(td, ((8 - dw) % 7) || 7);
  return { td: td, a: addDays_(td, -6), b: td, label: 'Week ending ' + eDate_(td), doneA: addDays_(td, -6), doneB: td, nextA: nm, nextB: addDays_(nm, 6) };
}

function facts_(L, W) {
  const open = L.filter(t => t.status !== 'done');
  return {
    open: open, overdue: open.filter(t => t.due && t.due < W.td), due: open.filter(t => between_(t.due, W.a, W.b)),
    started: open.filter(t => t.status === 'started'), blocked: open.filter(t => t.blocked),
    done: L.filter(t => t.status === 'done' && between_(t.doneAt.slice(0, 10), W.doneA, W.doneB)),
    next: W.nextA ? open.filter(t => between_(t.due, W.nextA, W.nextB)) : [],
    hotNoOwner: open.filter(t => (t.priority === 'urgent' || t.priority === 'high') && !t.assigneeId),
    created: L.filter(t => between_((t.createdAt || '').slice(0, 10), W.doneA, W.doneB))
  };
}

function buildEmail_(ctx, kind, m, W, test) {
  const team = ctx.team, set = ctx.settings, nameOf = id => (ctx.byId[id] || ctx.people[id] || {}).name || '';
  const owner = set.scopeOwner, ownTeam = owner ? below_(team, owner) : {};
  const scoped = ctx.tasks.filter(t => CFG.SCOPE_PROJECTS.indexOf(t.project) >= 0 || t.labels.some(l => CFG.SCOPE_LABELS.indexOf(l) >= 0) || ownTeam[t.assigneeId]);
  const lv = m.level, first = (m.name || '').split(' ')[0] || 'there';
  const L = lv === 'leadership' ? scoped : lv === 'manager' ? scoped.filter(t => below_(team, m.id)[t.assigneeId]) : scoped.filter(t => t.assigneeId === m.id);
  const F = facts_(L, W), ALL = facts_(scoped, W);

  const line = (t, owner) => {
    const bits = [owner ? (nameOf(t.assigneeId) || 'No owner') : null, t.project || null, PRI[t.priority], t.statusName, t.due ? 'due ' + eDate_(t.due) : null].filter(Boolean);
    return '<li style="margin:0 0 7px"><a href="' + esc_(t.url) + '" style="color:#151514;font-weight:600;text-decoration:none">' + esc_(t.id) + '</a> ' + esc_(t.title) + ' <span style="color:' + MUTED + '">· ' + bits.map(esc_).join(' · ') + '</span></li>';
  };
  const sec = (title, items, empty, owner, max) => {
    const sh = items.slice().sort(sortT_).slice(0, max || 25);
    return '<h3 style="font-size:16px;font-weight:600;margin:22px 0 8px">' + esc_(title) + (items.length ? ' <span style="color:' + MUTED + ';font-weight:400">· ' + items.length + '</span>' : '') + '</h3>' +
      (items.length ? '<ul style="margin:0;padding-left:18px">' + sh.map(t => line(t, owner)).join('') + '</ul>' + (items.length > sh.length ? '<p style="margin:4px 0 0;color:' + MUTED + '">+' + (items.length - sh.length) + ' more in Linear</p>' : '')
        : '<p style="margin:0;color:' + MUTED + '">' + esc_(empty) + '</p>');
  };
  const stats = arr => '<table cellpadding="0" cellspacing="6" style="width:100%;border-collapse:separate;margin:10px 0 4px"><tr>' + arr.map(x =>
    '<td style="padding:10px 12px;border-radius:14px;border:1px solid ' + (x[2] ? '#c9c56a' : LINE) + ';' + (x[2] ? 'background:#f6f3b8;' : '') + '"><div style="font-size:11px;color:' + MUTED + '">' + esc_(x[0]) + '</div><div style="font-size:26px;' + (x[3] && x[1] ? 'color:#cc4536;' : '') + '">' + x[1] + '</div></td>').join('') + '</tr></table>';
  const wins = done => {
    const box = '<div style="border:1px solid ' + LINE + ';border-radius:18px;padding:16px 18px;margin:18px 0"><div style="font-size:17px;font-weight:600">Design &amp; SEO wins this week</div>';
    if (!done.length) return box + '<p style="margin:6px 0 0;color:' + MUTED + '">No Design &amp; SEO issues were closed in this period.</p></div>';
    const g = {}; done.forEach(t => (g[t.assigneeId || ''] = g[t.assigneeId || ''] || []).push(t));
    return box + '<p style="margin:4px 0 12px;color:' + MUTED + '">The Design &amp; SEO team closed ' + done.length + ' issue' + (done.length > 1 ? 's' : '') + '.</p>' +
      Object.keys(g).map(k => { const p = ctx.byId[k]; return '<div style="font-weight:600;margin-top:8px">' + esc_(nameOf(k) || 'Team') + (p && p.title ? ' <span style="color:' + MUTED + ';font-weight:400">· ' + esc_(p.title) + '</span>' : '') + '</div><ul style="margin:4px 0 0;padding-left:18px">' +
        g[k].map(t => '<li><a href="' + esc_(t.url) + '" style="color:#151514;font-weight:600;text-decoration:none">' + esc_(t.id) + '</a> ' + esc_(t.title) + (t.project ? ' <span style="color:' + MUTED + '">· ' + esc_(t.project) + '</span>' : '') + '</li>').join('') + '</ul>'; }).join('') + '</div>';
  };
  const personTable = kindT => {
    const ids = Object.keys(L.reduce((o, t) => { if (t.assigneeId) o[t.assigneeId] = 1; return o; }, {}));
    const td = 'style="border-top:1px solid ' + LINE + ';padding:7px"';
    const rows = ids.map(id => ({ n: nameOf(id), o: F.open.filter(t => t.assigneeId === id).length, l: F.overdue.filter(t => t.assigneeId === id).length, b: F.blocked.filter(t => t.assigneeId === id).length, d: F.done.filter(t => t.assigneeId === id).length })).sort((a, b) => b.o - a.o);
    const head = kindT === 'review' ? ['Person', 'Done', 'Overdue', 'Blocked', 'Open'] : ['Person', 'Open', 'Overdue', 'Blocked'];
    return '<h3 style="font-size:16px;font-weight:600;margin:22px 0 8px">By person</h3><table cellpadding="0" style="border-collapse:collapse;width:100%;font-size:13px"><tr style="color:' + MUTED + ';text-align:left">' + head.map(x => '<th style="font-weight:500;padding:7px">' + x + '</th>').join('') + '</tr>' +
      rows.map(r => '<tr><td ' + td + '>' + esc_(r.n) + '</td>' + (kindT === 'review' ? '<td ' + td + '>' + r.d + '</td><td ' + td + '>' + r.l + '</td><td ' + td + '>' + r.b + '</td><td ' + td + '>' + r.o + '</td>' : '<td ' + td + '>' + r.o + '</td><td ' + td + '>' + r.l + '</td><td ' + td + '>' + r.b + '</td>') + '</tr>').join('') + '</table>';
  };
  const risks = () => {
    const r = [];
    if (F.hotNoOwner.length) r.push(F.hotNoOwner.length + ' urgent or high issue' + (F.hotNoOwner.length > 1 ? 's have' : ' has') + ' no owner: ' + F.hotNoOwner.slice().sort(sortT_).map(t => t.id).join(', ') + '.');
    if (F.overdue.length) r.push(F.overdue.length + ' overdue: ' + F.overdue.slice().sort(sortT_).slice(0, 6).map(t => t.id + (nameOf(t.assigneeId) ? ' (' + nameOf(t.assigneeId) + ')' : '')).join(', ') + '. Agree new dates.');
    if (F.blocked.length) r.push(F.blocked.length + ' blocked: ' + F.blocked.slice(0, 6).map(t => t.id).join(', ') + '.');
    const test = F.open.filter(t => /test/i.test(t.statusName)); if (test.length) r.push(test.length + ' issue' + (test.length > 1 ? 's are' : ' is') + ' waiting in Test.');
    return r.length ? '<h3 style="font-size:16px;font-weight:600;margin:22px 0 8px">Risks and decisions</h3><ol style="margin:0;padding-left:20px">' + r.map(x => '<li style="margin:0 0 6px">' + esc_(x) + '</li>').join('') + '</ol>' : '';
  };
  const attBlock = () => {
    const tracked = ctx.attPeople;
    const ppl = lv === 'employee' ? tracked.filter(x => x.id === m.id) : lv === 'manager' ? tracked.filter(x => below_(team, m.id)[x.id]) : tracked;
    if (!ppl.length) return '';
    const dates = meetingDays_(W.doneA, W.td, set);
    if (!dates.some(d => ctx.attendance[d])) return lv === 'employee' ? '' : '<h3 style="font-size:16px;font-weight:600;margin:22px 0 8px">' + esc_(set.meeting) + ' attendance</h3><p style="margin:0;color:' + MUTED + '">No attendance was recorded for this period.</p>';
    const td = 'style="border-top:1px solid ' + LINE + ';padding:7px"';
    const rows = ppl.map(x => { const c = attCount_(ctx.attendance, dates, x.id, W.td); return '<tr><td ' + td + '>' + esc_(x.name) + '</td><td ' + td + '>' + c.ontime + '</td><td ' + td + '>' + c.late + (c.lateMins ? ' <span style="color:' + MUTED + '">(' + c.lateMins + ' min)</span>' : '') + '</td><td ' + td + '>' + c.absent + '</td></tr>'; }).join('');
    return '<h3 style="font-size:16px;font-weight:600;margin:22px 0 4px">' + esc_(set.meeting) + ' attendance</h3><p style="margin:0 0 8px;color:' + MUTED + ';font-size:13px">' + dates.length + ' meeting day' + (dates.length === 1 ? '' : 's') + ' · on time = joined within ' + (set.grace ? set.grace + ' minutes' : 'the start time') + '</p>' +
      '<table cellpadding="0" style="border-collapse:collapse;width:100%;font-size:13px"><tr style="color:' + MUTED + ';text-align:left"><th style="font-weight:500;padding:7px">Person</th><th style="font-weight:500;padding:7px">On time</th><th style="font-weight:500;padding:7px">Late</th><th style="font-weight:500;padding:7px">Absent</th></tr>' + rows + '</table>';
  };
  const hdr = t => '<h2 style="margin:0 0 2px;font-size:22px;font-weight:500">' + esc_(t) + '</h2><p style="margin:0 0 14px;color:' + MUTED + ';font-size:13px">Takshila Design &amp; SEO · ' + esc_(W.label) + '</p>';
  let subject, body;
  if (kind === 'ahead') {
    if (lv === 'employee') {
      subject = 'Your week ahead · ' + W.label + ' · ' + F.due.length + ' due';
      const focus = F.overdue.concat(F.due, F.open).sort(sortT_)[0];
      body = hdr('Hi ' + first + ", here's your week ahead") + '<p>You have <b>' + F.open.length + ' open</b> issue' + (F.open.length === 1 ? '' : 's') + (F.overdue.length ? ', <b style="color:#cc4536">' + F.overdue.length + ' overdue</b>' : '') + ', and ' + F.due.length + ' due in this period.</p>' +
        sec('Overdue', F.overdue, 'Nothing overdue.') + sec('Due this period', F.due, 'Nothing due in this period.') + sec('Blocked', F.blocked, 'Nothing blocked.') + sec('In progress', F.started, 'Nothing in progress.') +
        sec('Other open issues', F.open.filter(t => F.overdue.indexOf(t) < 0 && F.due.indexOf(t) < 0 && F.started.indexOf(t) < 0), 'No other open issues.', false, 15) +
        (focus ? '<h3 style="font-size:16px;font-weight:600;margin:22px 0 8px">Focus</h3><p style="margin:0">Start with <a href="' + esc_(focus.url) + '" style="color:#151514;font-weight:600">' + esc_(focus.id) + '</a> ' + esc_(focus.title) + '.</p>' : '');
    } else {
      const isL = lv === 'leadership';
      subject = (isL ? 'Design & SEO week ahead' : "Your team's week ahead") + ' · ' + W.label + ' · ' + F.overdue.length + ' overdue, ' + F.due.length + ' due';
      body = hdr('Hi ' + first + ", here's the " + (isL ? 'Design & SEO' : "team's") + ' week ahead') +
        '<p>' + F.open.length + ' Design &amp; SEO issues are open. ' + (F.overdue.length ? '<b style="color:#cc4536">' + F.overdue.length + ' overdue</b>. ' : 'Nothing is overdue. ') + F.due.length + ' due in this period' + (F.hotNoOwner.length ? ', and <b>' + F.hotNoOwner.length + ' urgent or high issues have no owner</b>' : '') + '.</p>' +
        stats([['Open', F.open.length], ['Due', F.due.length], ['Overdue', F.overdue.length, false, true], ['In progress', F.started.length], ['No owner (urgent/high)', F.hotNoOwner.length, true]]) +
        sec('Overdue', F.overdue, 'Nothing overdue.', true) + sec('Due this period', F.due, 'Nothing due in this period.', true) + sec('Urgent & high with no owner', F.hotNoOwner, 'Every urgent and high issue has an owner.', true, 10) +
        sec('Top priorities', F.open.filter(t => t.priority === 'urgent' || t.priority === 'high'), 'No urgent or high issues open.', true, 5) + sec('In progress', F.started, 'Nothing in progress.', true, 10) + personTable('ahead') + risks();
    }
  } else {
    if (lv === 'employee') {
      subject = 'Your week in review · ' + W.label + ' · ' + ALL.done.length + ' done by the team';
      body = hdr('Hi ' + first + ", here's the week in review") + '<p>' + (F.done.length ? 'You closed <b>' + F.done.length + '</b> issue' + (F.done.length > 1 ? 's' : '') + '. Thank you!' : 'No issues of yours were closed in this period.') + '</p>' +
        wins(ALL.done) + '<h2 style="font-size:18px;font-weight:500;margin:24px 0 0">Your week</h2>' +
        sec('You completed', F.done, 'Nothing completed in this period.') + sec('Slipped / overdue', F.overdue, 'Nothing overdue.') + sec('Blocked', F.blocked, 'Nothing blocked.') +
        (W.nextA ? sec('Due next week', F.next, 'Nothing due next week.') : sec('Still open', F.open, 'Nothing open.', false, 15)) + attBlock();
    } else {
      const isL = lv === 'leadership';
      subject = (isL ? 'Design & SEO week in review' : "Your team's week in review") + ' · ' + W.label + ' · ' + F.done.length + ' done, ' + F.overdue.length + ' overdue';
      body = hdr('Hi ' + first + ", here's the " + (isL ? 'Design & SEO' : "team's") + ' week in review') +
        '<p>The team closed <b>' + F.done.length + '</b> Design &amp; SEO issue' + (F.done.length === 1 ? '' : 's') + ' and added ' + F.created.length + '. ' + F.open.length + ' are open' + (F.overdue.length ? ', <b style="color:#cc4536">' + F.overdue.length + ' overdue</b>' : '') + '.</p>' +
        wins(isL ? ALL.done : F.done) + stats([['Completed', F.done.length, true], ['Created', F.created.length], ['Open', F.open.length], ['Overdue', F.overdue.length, false, true], ['Blocked', F.blocked.length]]) +
        sec('Slipped / overdue', F.overdue, 'Nothing overdue.', true) + sec('Blocked', F.blocked, 'Nothing blocked.', true) +
        (W.nextA ? sec('Due next week', F.next, 'Nothing due next week.', true) : sec('Due in this period', F.due, 'Nothing due in this period.', true)) + personTable('review') + attBlock() + risks();
    }
  }
  const btn = 'display:inline-block;border:1.5px solid #151514;color:#151514;padding:9px 18px;border-radius:999px;text-decoration:none;font-weight:600;margin:0 8px 8px 0';
  const html = '<div style="font-family:\'Google Sans\',Arial,Helvetica,sans-serif;color:#151514;max-width:680px;line-height:1.5;font-size:14px">' +
    (test ? '<p style="border:1px solid #c9c56a;padding:6px 14px;border-radius:999px;font-size:12.5px;margin:0 0 16px;display:inline-block">Test email</p>' : '') + body +
    '<p style="margin-top:28px"><a href="' + CFG.LINEAR_WEB + '" style="' + btn + '">Open Linear →</a>' + (set.dashboardUrl ? '<a href="' + esc_(set.dashboardUrl) + '" style="' + btn + '">Open dashboard →</a>' : '') + '</p></div>';
  return { subject: (test ? '[Test] ' : '') + subject, html: html };
}

function toText_(html) {
  return html.replace(/<li[^>]*>/g, '\n- ').replace(/<\/(h2|h3|p|ul|ol|tr|div)>/g, '\n').replace(/<\/t[dh]>/g, ' | ')
    .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function context_(force) {
  const team = readTeam(), settings = readSettings(), T = tasks_(team, force);
  const byId = {}; team.forEach(m => byId[m.id] = m);
  if (!settings.scopeOwner) { const lead = team.find(m => m.level === 'leadership'); settings.scopeOwner = lead ? lead.id : ''; }
  return { team: team, byId: byId, settings: settings, tasks: T.tasks, people: T.people, hidden: T.hidden, attendance: readAttendance(120), attPeople: attPeople_(team, settings) };
}

function attPeople_(team, set) {
  return team.filter(m => set.attendees.length ? set.attendees.indexOf(m.id) >= 0 : m.inReports);
}

function attCount_(att, dates, id, td) {
  const o = { ontime: 0, late: 0, absent: 0, excused: 0, none: 0, lateMins: 0 };
  dates.forEach(d => { if (d > td) return; const r = att[d] && att[d][id]; if (!r || !r.status) { o.none++; return; } o[r.status] = (o[r.status] || 0) + 1; if (r.status === 'late' && r.minsLate) o.lateMins += r.minsLate; });
  return o;
}

/**
 * Sends one email per recipient.
 * opts: {period: 'std'|'today'|'range', from, to, onlyId, test}
 */
function sendDigest(kind, opts) {
  opts = opts || {};
  const ctx = context_(true);
  const W = windows_(kind, opts.period || 'std', opts.from, opts.to);
  const list = ctx.team.filter(m => m.email && (opts.onlyId ? m.id === opts.onlyId : (m.getsEmail && m.inReports)));
  let sent = 0; const failed = [];
  list.forEach(m => {
    try {
      const e = buildEmail_(ctx, kind, m, W, !!opts.test);
      const links = '\n\nOpen Linear: ' + CFG.LINEAR_WEB + (ctx.settings.dashboardUrl ? '\nDashboard: ' + ctx.settings.dashboardUrl : '');
      GmailApp.sendEmail(m.email, e.subject, toText_(e.html) + links, { htmlBody: e.html, name: CFG.SENDER_NAME });
      sent++;
    } catch (err) { failed.push(m.name + ': ' + err.message); }
  });
  Logger.log('Sent ' + sent + ' of ' + list.length + (failed.length ? '. Failed: ' + failed.join('; ') : ''));
  return { sent: sent, total: list.length, failed: failed };
}

function sendMonday() { return sendDigest('ahead', {}); }
function sendFriday() { return sendDigest('review', {}); }

/** Handy for a first check: emails only the scope owner a [Test] Friday review. */
function sendTestToMe() {
  const set = readSettings(), team = readTeam();
  const me = team.find(m => m.id === set.scopeOwner) || team.find(m => m.level === 'leadership');
  return sendDigest('review', { onlyId: me.id, test: true });
}

/* ============================== ATTENDANCE CHECK ============================== */

/** Daily after the stand-up: cancellations and declines from Calendar, join times from the Meet attendance report. */
function attendanceCheck() {
  const set = readSettings();
  const local = localDay_();
  if (set.days.indexOf(dow_(local)) < 0) return 'Not a meeting day.';
  const date = workDay_();
  const team = readTeam(), tracked = attPeople_(team, set);
  const start = Utilities.parseDate(local + ' 00:00', CFG.TZ_LOCAL, 'yyyy-MM-dd HH:mm');
  const end = new Date(start.getTime() + 864e5);
  const ev = CalendarApp.getDefaultCalendar().getEvents(start, end).find(e => e.getTitle().toLowerCase().indexOf(String(set.calendarTitle).toLowerCase()) >= 0);
  if (!ev) return 'No stand-up on the calendar today (cancelled or not found).';
  const meetStart = ev.getStartTime();

  const declined = {};
  ev.getGuestList(true).forEach(g => { if (g.getGuestStatus() === CalendarApp.GuestStatus.NO) declined[g.getEmail().toLowerCase()] = true; });

  const joins = meetJoins_(ev.getTitle(), meetStart);   // {email|name(lowercase): Date}
  const graceMs = (set.grace || 0) * 60000;
  const lines = [];
  tracked.forEach(m => {
    const keys = [m.email, m.linearEmail, m.name].filter(Boolean).map(s => s.toLowerCase());
    const joined = keys.map(k => joins && joins[k]).find(Boolean);
    const didDecline = keys.some(k => declined[k]);
    let status = null, minsLate = null, joinedAt = '';
    if (joined) {
      joinedAt = Utilities.formatDate(joined, CFG.TZ_LOCAL, 'HH:mm');
      if (joined.getTime() <= meetStart.getTime() + graceMs) status = 'ontime';
      else { status = 'late'; minsLate = Math.round((joined.getTime() - meetStart.getTime()) / 60000); }
    } else if (didDecline) status = 'excused';
    else if (joins) status = 'absent';
    if (status) { setAttendance(date, m.id, status, minsLate, joinedAt, joins ? 'meet' : 'calendar'); lines.push(m.name + ': ' + status + (minsLate ? ' (' + minsLate + ' min)' : '')); }
  });
  const msg = (joins ? 'Recorded from the Meet report. ' : 'No Meet attendance report found yet; recorded declines only. ') + lines.join(', ');
  Logger.log(msg);
  return msg;
}

/** Finds today's Meet attendance report email and returns first-join times keyed by lowercase email and name. */
function meetJoins_(title, meetStart) {
  const threads = GmailApp.search('from:' + CFG.MEET_SENDER + ' newer_than:2d', 0, 20);
  let sheetId = null;
  threads.some(th => th.getMessages().some(msg => {
    const s = msg.getSubject() + ' ' + msg.getPlainBody();
    if (!/attendance/i.test(s)) return false;
    if (s.toLowerCase().indexOf(title.toLowerCase().slice(0, 20)) < 0) return false;
    const m = msg.getBody().match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (m) { sheetId = m[1]; return true; }
    return false;
  }));
  if (!sheetId) return null;
  const rows = SpreadsheetApp.openById(sheetId).getSheets()[0].getDataRange().getValues();
  const hi = rows.findIndex(r => r.some(c => /e-?mail/i.test(String(c))));
  if (hi < 0) return null;
  const h = rows[hi].map(c => String(c).toLowerCase());
  const ei = h.findIndex(c => /e-?mail/.test(c));
  const ji = h.findIndex(c => /(first seen|joined|join time|time joined|first join)/.test(c));
  const fi = h.findIndex(c => /first name/.test(c)), li = h.findIndex(c => /last name/.test(c)), ni = h.findIndex(c => /^name$|participant/.test(c));
  const out = {};
  rows.slice(hi + 1).forEach(r => {
    const t = toDate_(r[ji], meetStart); if (!t) return;
    const keys = [];
    if (ei >= 0 && r[ei]) keys.push(String(r[ei]).toLowerCase().trim());
    const nm = ni >= 0 ? String(r[ni]) : [fi >= 0 ? r[fi] : '', li >= 0 ? r[li] : ''].join(' ');
    if (nm.trim()) keys.push(nm.trim().toLowerCase());
    keys.forEach(k => { if (!out[k] || t < out[k]) out[k] = t; });
  });
  return out;
}

function toDate_(v, ref) {
  if (v instanceof Date) {
    if (v.getFullYear() < 1950) {   // time-only cell
      const d = new Date(ref); d.setHours(v.getHours(), v.getMinutes(), v.getSeconds(), 0); return d;
    }
    return v;
  }
  const s = String(v || '').trim(); if (!s) return null;
  const m = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i); if (!m) return null;
  let hh = Number(m[1]); const ap = (m[4] || '').toLowerCase();
  if (ap === 'pm' && hh < 12) hh += 12; if (ap === 'am' && hh === 12) hh = 0;
  const day = Utilities.formatDate(ref, CFG.TZ_LOCAL, 'yyyy-MM-dd');
  return Utilities.parseDate(day + ' ' + ('0' + hh).slice(-2) + ':' + m[2] + ':' + (m[3] || '00'), CFG.TZ_LOCAL, 'yyyy-MM-dd HH:mm:ss');
}

/* ============================== LOGIN (email + one-time code) ============================== */

const SESSION_DAYS = 30;

function tokens_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('SESSIONS') || '{}'); } catch (e) { return {}; } }
function saveTokens_(t) {
  const now = Date.now(); Object.keys(t).forEach(k => { if (t[k].exp < now) delete t[k]; });
  PropertiesService.getScriptProperties().setProperty('SESSIONS', JSON.stringify(t));
}

/** Emails a 6-digit code to a Team member. Always answers the same way, so it doesn't reveal who is on the team. */
function requestCode_(email) {
  email = String(email || '').trim().toLowerCase();
  const m = readTeam().find(x => x.email.toLowerCase() === email || x.linearEmail.toLowerCase() === email);
  if (m) {
    const cache = CacheService.getScriptCache();
    const tries = Number(cache.get('codeSent_' + email) || 0);
    if (tries < 5) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      cache.put('code_' + email, JSON.stringify({ code: code, id: m.id, left: 5 }), 600);
      cache.put('codeSent_' + email, String(tries + 1), 3600);
      GmailApp.sendEmail(email, 'Your Takshila dashboard sign-in code: ' + code,
        'Your sign-in code is ' + code + '. It expires in 10 minutes.\n\nIf you didn\'t ask for this, you can ignore this email.',
        { name: CFG.SENDER_NAME, htmlBody: '<div style="font-family:Arial,sans-serif;font-size:15px;color:#151514"><p>Your sign-in code for the Takshila dashboard:</p><p style="font-size:30px;letter-spacing:6px;font-weight:700;margin:12px 0">' + code + '</p><p style="color:#72706a">It expires in 10 minutes. If you didn\'t ask for this, you can ignore this email.</p></div>' });
    }
  }
  return { ok: true };
}

function verifyCode_(email, code) {
  email = String(email || '').trim().toLowerCase();
  const cache = CacheService.getScriptCache();
  const raw = cache.get('code_' + email);
  if (!raw) return { ok: false, error: 'code_expired' };
  const c = JSON.parse(raw);
  if (String(code).trim() !== c.code) {
    c.left--; if (c.left <= 0) cache.remove('code_' + email); else cache.put('code_' + email, JSON.stringify(c), 600);
    return { ok: false, error: 'wrong_code' };
  }
  cache.remove('code_' + email);
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const t = tokens_(); t[token] = { id: c.id, exp: Date.now() + SESSION_DAYS * 864e5 }; saveTokens_(t);
  return { ok: true, token: token };
}

function signOut_(token) { const t = tokens_(); delete t[token]; saveTokens_(t); return { ok: true }; }

/** Returns the signed-in Team member for a token, or null. The admin ACCESS_KEY acts as the scope owner. */
function whoIs_(token, key, team) {
  team = team || readTeam();
  const k = PropertiesService.getScriptProperties().getProperty('ACCESS_KEY');
  if (key && k && key === k) { const s = readSettings(); return team.find(m => m.id === s.scopeOwner) || team.find(m => m.level === 'leadership') || null; }
  const s = token && tokens_()[token];
  if (!s || s.exp < Date.now()) return null;
  return team.find(m => m.id === s.id) || null;
}

/** What each role may see: leadership everything, managers their reporting line, employees only themselves. */
function visibleIds_(me, team) {
  if (me.level === 'leadership') return null;   // null = everyone
  if (me.level === 'manager') return below_(team, me.id);
  const o = {}; o[me.id] = true; return o;
}

/* ============================== WEB API (for Framer) ============================== */

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** GET ?token=…  → the signed-in person's dashboard data, filtered by their role. &refresh=1 bypasses the Linear cache. */
function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    const team = readTeam();
    const me = whoIs_(p.token, p.key, team);
    if (!me) return json_({ ok: false, error: 'signed_out' });
    const ctx = context_(p.refresh === '1');
    const vis = visibleIds_(me, team);
    const can = id => !vis || vis[id];
    const att = {};
    Object.keys(ctx.attendance).forEach(d => { Object.keys(ctx.attendance[d]).forEach(id => { if (can(id)) (att[d] = att[d] || {})[id] = ctx.attendance[d][id]; }); });
    return json_({
      ok: true, me: { id: me.id, name: me.name, title: me.title, level: me.level },
      today: workDay_(), updated: new Date().toISOString(),
      team: me.level === 'leadership' ? ctx.team : ctx.team.filter(m => can(m.id)),
      settings: ctx.settings, hidden: me.level === 'leadership' ? ctx.hidden : 0,
      tasks: vis ? ctx.tasks.filter(t => can(t.assigneeId)) : ctx.tasks,
      people: vis ? {} : ctx.people,
      attendance: att, attendees: ctx.attPeople.map(m => m.id).filter(can)
    });
  } catch (err) { return json_({ ok: false, error: err.message }); }
}

/**
 * POST (Content-Type text/plain, body JSON) {action, token, …}
 *  requestCode {email}  ·  verifyCode {email, code} → {token}  ·  signOut
 *  Leadership only:
 *   setAttendance {date, personId, status}   status: ontime|late|absent|excused|'' (clear)
 *   setAttendees  {ids: [...]}
 *   saveMember    {member: {...}}            adds or updates a Team row
 *   removeMember  {id}
 *   saveSettings  {settings: {...}}
 *   sendNow       {kind: 'ahead'|'review', period, from, to, onlyMe}
 */
function doPost(e) {
  let b = {};
  try { b = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad_json' }); }
  if (b.action === 'requestCode') return json_(requestCode_(b.email));
  if (b.action === 'verifyCode') return json_(verifyCode_(b.email, b.code));
  if (b.action === 'signOut') return json_(signOut_(b.token));
  const me = whoIs_(b.token, b.key);
  if (!me) return json_({ ok: false, error: 'signed_out' });
  if (me.level !== 'leadership') return json_({ ok: false, error: 'not_allowed' });
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    switch (b.action) {
      case 'setAttendance': {
        const okStatus = ['', 'ontime', 'late', 'absent', 'excused'];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date) || okStatus.indexOf(b.status || '') < 0) return json_({ ok: false, error: 'bad_input' });
        setAttendance(b.date, String(b.personId), b.status || '', null, '', 'manual'); return json_({ ok: true });
      }
      case 'setAttendees': writeSetting('attendees', (b.ids || []).map(String).join(',')); return json_({ ok: true });
      case 'saveMember': {
        const m = b.member || {}; if (!m.id || !m.name) return json_({ ok: false, error: 'bad_input' });
        writeMember({ id: String(m.id), name: m.name, email: m.email || '', linearEmail: m.linearEmail || '', title: m.title || '', level: m.level || 'employee', reportsTo: m.reportsTo || '', getsEmail: m.getsEmail !== false, inReports: m.inReports !== false });
        return json_({ ok: true });
      }
      case 'removeMember': removeMember(String(b.id)); return json_({ ok: true });
      case 'saveSettings': {
        const s = b.settings || {};
        ['meeting', 'calendarTitle', 'start', 'grace', 'scopeOwner', 'dashboardUrl'].forEach(k => { if (s[k] !== undefined) writeSetting(k, String(s[k])); });
        if (Array.isArray(s.days)) writeSetting('days', s.days.join(','));
        return json_({ ok: true });
      }
      case 'sendNow': {
        const r = sendDigest(b.kind === 'ahead' ? 'ahead' : 'review', { period: b.period, from: b.from, to: b.to, onlyId: b.onlyMe ? me.id : null, test: !!b.onlyMe });
        return json_({ ok: true, result: r });
      }
      default: return json_({ ok: false, error: 'unknown_action' });
    }
  } catch (err) { return json_({ ok: false, error: err.message }); }
  finally { lock.releaseLock(); }
}
