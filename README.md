# Woman Mastery HQ — Personal Portal

Private membership portal for WMHQ members.

---

## 🚀 Setup Instructions

### 1. Create Your Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **Anon Key** (found in Project Settings > API).
3. In the Supabase dashboard, go to **SQL Editor > New Query**.
4. Paste the entire contents of `supabase/schema.sql` and click **Run**.
5. All tables will be created with Row Level Security enabled.

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

### 3. Add Member Emails (Manual Approval — No Open Signups)

Since there are no open signups, you must add members manually:

**Option A — Supabase Dashboard (recommended):**
1. Go to your Supabase project dashboard.
2. Navigate to **Authentication > Users**.
3. Click **Invite User** (top right).
4. Enter the member's email address.
5. The member receives an email to set their password.

**Option B — Supabase Admin API:**
```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/auth/v1/admin/users' \
  -H 'apikey: YOUR_SERVICE_ROLE_KEY' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"email": "member@example.com", "password": "temporarypassword", "email_confirm": true}'
```

> ⚠️ Use the **Service Role Key** (not Anon Key) for admin operations. Keep this key secret — never expose it in frontend code.

### 4. Disable Public Signups

To ensure nobody can self-register:
1. Go to Supabase dashboard > **Authentication > Settings**.
2. Under **Auth Providers**, find the Email provider.
3. Turn off **Enable Email Signup** (or keep it off by not providing a signup form — the portal has no signup form by design).

### 5. Run Locally

```bash
npm install
npm run dev
```

The portal will be available at `http://localhost:5173`.

---

## 🌐 Deploy to Netlify

### Option A — Netlify CLI (fastest)

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

When prompted, set your build command to `npm run build` and publish directory to `dist`.

### Option B — Netlify Dashboard (drag & drop)

1. Run `npm run build` locally.
2. Go to [app.netlify.com](https://app.netlify.com) and drag the `dist/` folder into the deploy zone.

### Option C — GitHub + Netlify (recommended for ongoing updates)

1. Push this project to a GitHub repository.
2. In Netlify dashboard, click **Add new site > Import an existing project**.
3. Connect your GitHub repo.
4. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click **Deploy site**.

### Set Environment Variables in Netlify

After deploying, go to **Site Settings > Environment Variables** and add:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://your-project-id.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `your-anon-key` |

Then trigger a redeploy.

---

## 🔗 Connect a Custom Domain

1. In Netlify dashboard, go to **Site Settings > Domain Management**.
2. Click **Add custom domain**.
3. Enter your domain (e.g., `portal.jessicapinili.com`).
4. Follow the DNS configuration steps Netlify provides:
   - Add a CNAME record pointing to your Netlify subdomain, OR
   - Update your nameservers to Netlify's nameservers.
5. SSL is provisioned automatically (usually within minutes).

---

## 📁 Project Structure

```
wmhq-portal/
├── src/
│   ├── contexts/       # Auth context
│   ├── lib/            # Supabase client, utils, insights
│   ├── components/     # Sidebar, Layout
│   └── pages/          # All 8 pages
├── supabase/
│   └── schema.sql      # Database schema + RLS policies
├── .env.example        # Environment variable template
├── netlify.toml        # Netlify config
└── vite.config.js      # Build config
```

---

## 🔐 Security Notes

- **Row Level Security (RLS)** is enabled on every table — members can only access their own data.
- The Supabase **Anon Key** is safe to expose in the frontend (it's designed for this).
- The **Service Role Key** must be kept secret — never put it in the frontend code.
- No public signup form exists in the portal — access is invitation-only.

---

## 📋 Data Reset Schedule

| Feature | Resets |
|---|---|
| Daily Marketing Checklist | Every day at midnight |
| Season of Month | 1st of each month |
| Content Tracker | Every Sunday midnight (keyed by week) |
| Visibility Blocks | Every Sunday midnight (keyed by week) |
| Funnel View | Every Sunday midnight (keyed by week) |
| Content System | Never resets |
| Weekly Review | New review opens each Monday |
| Business/Life Focus | Never (until manually deleted) |
| Quarterly Revenue Review | Resets each quarter (past reviews archived) |
| Revenue Events | Never (keeps 2 years) |
| MRR / ILN | Never (until manually updated) |
| All Influence data | Never (until manually deleted) |
| Identity Patterns | Never (until manually deleted) |

---

© Woman Mastery HQ. All rights reserved. Property of Jessica Pinili.
