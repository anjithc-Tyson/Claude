# Takshila Team Hub (no Claude needed)

A team dashboard and weekly email system that runs entirely on **Google Apps Script** and **Framer**.

| Part | Where it runs | What it does |
|---|---|---|
| `apps-script/Code.gs` | Google Apps Script (free with Google Workspace) | Stores the team, roles and attendance in a Google Sheet. Reads tasks from Linear. Sends the Monday and Friday emails from Gmail. Checks stand-up attendance from Google Calendar and the Meet attendance report. Provides the sign-in and the data the dashboard shows. |
| `framer/TeamHub.tsx` | Your Framer site | The dashboard, with a left-hand menu: Dashboard, Tasks, Check-ins, Stand-up attendance, Onboarding, Documents and (leadership) Team & emails. |

```
Framer page (TeamHub component)
   │  sign in with work email + one-time code
   ▼
Apps Script web app ──► Google Sheet (Team · Attendance · Settings)
   │                ├─► Linear API (tasks)
   │                ├─► Gmail (weekly emails, sign-in codes)
   │                └─► Google Calendar + Meet attendance reports
   └─ time triggers: Monday plan · Friday review · daily attendance check
```

**Who sees what.** People sign in with the email on the Team sheet. The engine decides what each person receives:
- **Leadership** see everything, mark attendance, edit the team and send emails.
- **Managers** see their own work and everyone below them.
- **Employees** see only their own tasks and attendance.

**Emails** cover Design & SEO work only, for everyone:
- issues in the Design or SEO project,
- issues with a Design or SEO label,
- issues assigned to the Design & SEO lead (the `scopeOwner` setting) or anyone reporting to them.

The dashboard itself shows all work.

---

## 1. Create the engine (about 15 minutes)

1. Go to [script.google.com](https://script.google.com) → **New project**. Name it "Takshila Team Hub".
2. Replace the contents of `Code.gs` with [`apps-script/Code.gs`](apps-script/Code.gs).
3. **Project Settings** (gear icon) → tick **Show "appsscript.json" manifest file in editor**. Open `appsscript.json` and replace it with [`apps-script/appsscript.json`](apps-script/appsscript.json).
4. Back in the editor, choose the `setup` function and click **Run**. Approve the permissions Google asks for.
   - The log shows your new **Google Sheet** link.
   - The log also shows an **admin access key**. Keep it private. It isn't needed in Framer.

## 2. Fill in the Google Sheet

Open the Sheet from the log.

**Team tab.** One row per person. You can import the `team.csv` file Claude gave you: File → Import → Upload → *Replace current sheet*, with the **Team** tab selected.

| Column | Meaning |
|---|---|
| `id` | Short unique id, e.g. `anjith`, `alina` |
| `name`, `title` | Shown on the dashboard and in emails |
| `email` | Where emails and sign-in codes go |
| `linearEmail` | Their Linear login email, if different |
| `level` | `leadership`, `manager` or `employee` |
| `reportsTo` | The `id` of their manager (blank for none) |
| `getsEmail` | `TRUE` / `FALSE` — receives the weekly emails |
| `inReports` | `TRUE` / `FALSE` — when `FALSE`, their work is left out of every email and the dashboard |

**Settings tab.**

| key | Example | Meaning |
|---|---|---|
| `meeting` | Product Design Stand Up Call | Name shown on the Attendance tab and in emails |
| `calendarTitle` | Product Design Stand Up | Text to find the stand-up in Google Calendar |
| `start` | 21:00 | Stand-up start, India time, 24-hour |
| `grace` | 2 | Minutes after the start that still count as on time |
| `days` | 1,2,3,4,5 | Meeting days (0 = Sunday … 6 = Saturday) |
| `attendees` | anjith,aikansh,himanshi,alina | Team ids tracked for attendance. Blank = everyone with `inReports` on |
| `scopeOwner` | anjith | Team id of the Design & SEO lead |
| `dashboardUrl` | https://your-site.framer.website | Linked at the bottom of every email |

## 3. Connect Linear

1. In Linear: **Settings → Security & access → Personal API keys → New key**. Read access is enough.
2. In Apps Script: **Project Settings → Script properties → Add script property**.
   - Property: `LINEAR_API_KEY`
   - Value: the key from step 1.

Never paste the key into the code, the Sheet or Framer.

## 4. Publish the engine

1. **Deploy → New deployment →** type **Web app**.
2. Set **Execute as:** *Me*, and **Who has access:** *Anyone*.
   - The data stays protected: nothing is returned until someone signs in with a code sent to an email on the Team sheet.
3. Click **Deploy** and copy the **Web app URL** (ends in `/exec`). The Framer component needs it.
4. After any later change to `Code.gs`, use **Deploy → Manage deployments → Edit → New version**, so the same URL keeps working.

## 5. Turn on the schedules and test

1. Run `installTriggers` once. It creates three schedules, all in India time:
   - **Monday plan:** about 8:45 PM on Mondays.
   - **Friday review:** about 12:05 AM on Saturdays (the end of the US Friday).
   - **Daily attendance check:** about 10:20 PM.
2. Run `sendTestToMe`. It emails the `scopeOwner` a **[Test]** Friday review, so you can check the layout.
3. Optional: run `attendanceCheck` right after a stand-up to see what it records. Check **Executions** for the log.

## 6. Add the dashboard to Framer

1. In your Framer project: **Assets → Code → + → New Code File**, name it `TeamHub`.
2. Replace its contents with [`framer/TeamHub.tsx`](framer/TeamHub.tsx) and save.
3. Drag **TeamHub** onto a new page, for example `/team`. Set it to fill the page: width and height **Fill**, or **100%**.
4. In the right-hand properties panel:
   - paste the **API URL** from step 4;
   - set the colours, font, corner radius and sign-in title.
5. Publish. Open the page, enter your work email, and use the 6-digit code from your inbox.

**Dark theme:** set Background `#141412`, Panels `#1D1D1A`, Inset `#262622`, Text `#F0EFE9`, Muted text `#A4A29A`.

## Check-ins, Onboarding and Documents

These live in the same Google Sheet, in five more tabs: **WorkLog**, **Folders**, **Documents**, **Onboarding** and **Progress**.

**Check-ins.** Everyone has a **Check in** / **Check out** button at the top of the dashboard. Each press is saved to the WorkLog tab with the exact time. Times always come from the server clock: nobody, including leadership, can type or change a check-in or check-out time. People can say what they worked on when they check out, and can edit that note for 12 hours after checking out; after that it locks. The engine enforces both rules, not just the dashboard. If someone signs out while still checked in, the dashboard asks whether to check out first. The **Check-ins** section shows a week grid of hours per person and every session. Employees see only their own. Leadership see everyone.

**Onboarding.** Leadership add steps from the dashboard (**Onboarding → + Add step**). Each step is one of:
- **Video to watch.** YouTube, Google Drive, Loom, Vimeo or a direct `.mp4` link. For YouTube and `.mp4` videos, the step only unlocks after 90% of the video has actually been played, and skipping ahead in an `.mp4` isn't allowed. Drive, Loom and Vimeo can't report progress, so those unlock after the length you set (in minutes) has passed with the page open.
- **Document to read** or **link to open.** Unlocks once it's been opened.
- **Task to do.** Marked done by the person.

Steps are done in order: a required step has to be finished before the next one opens. New people land on Onboarding when they sign in, and see a reminder banner until the required steps are done. Leadership can see everyone's progress (**Team progress**) and reset a step for someone.

**Documents.** Folders of links, for example Design, Research, Policies & HR (these three are created for you). Leadership add folders and documents from the dashboard. Everyone can browse and search them. Links to Google Docs, Sheets, Slides, Drive, Figma, Notion, PDFs and videos get a matching label. Make sure the files themselves are shared with the team in Google Drive or Figma: the dashboard only holds the links.

### Upgrading an existing setup

1. Replace `Code.gs` in Apps Script with the new [`apps-script/Code.gs`](apps-script/Code.gs) and save.
2. Run `upgradeSheets` once. It adds the five new tabs to your Sheet.
3. **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy.** The web app URL stays the same.
4. Replace the Framer code file with the new [`framer/TeamHub.tsx`](framer/TeamHub.tsx) and publish.

Until step 3 is done, the new sections show "Update the Apps Script engine".

## Attendance from Google Meet

The daily check marks **Excused** for anyone who declined the stand-up in Calendar, and skips days when the stand-up was cancelled.

**On time / Late / Absent** come from Google Meet's attendance report. To get one:
1. Open the stand-up in Google Calendar → **Edit** (all events in the series).
2. Open **Video call options** (gear) → turn on **Attendance tracking** → Save.

After each call, the organizer gets an "Attendance report" email with a Google Sheet of join times. The script finds that email, reads the sheet and works out who was on time. This needs a Google Workspace plan with attendance tracking (Business Standard or higher). If Google changes the report's column names, adjust the column matching in `meetJoins_()` in `Code.gs`.

Manual marks made on the Attendance tab always win over automatic ones.

## Letting someone else customise it

- **Same data, different look:** duplicate the Framer project and change the TeamHub properties or layout. Both sites use the same engine.
- **Completely separate setup:** make a copy of the Apps Script project. File → Make a copy, then run `setup` in the copy, which creates its own Sheet. Deploy it and point their Framer component at the new URL.
- **Different email rules:** change `CFG.SCOPE_PROJECTS` / `CFG.SCOPE_LABELS` at the top of `Code.gs`, then redeploy.

## Security notes

- **Sign-in codes:** expire after 10 minutes and allow 5 attempts. Each email can request at most 5 codes an hour.
- **Sessions:** last 30 days. **Sign out** ends the session on the server.
- **Roles are enforced by the engine:** an employee's browser never receives other people's tasks or attendance.
- **Secrets stay out of code:** the Linear key and the admin access key live only in Apps Script's Script Properties. This repository is public, so never commit names, emails or keys.
- **Email limits:** Google Workspace accounts can send about 1,500 emails a day from Apps Script, which is far more than this needs.
