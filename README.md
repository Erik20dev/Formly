# Formly — Interactive Form Builder with Chatbot Widget

A responsive full-stack MVP built with Next.js, React, TypeScript, Tailwind CSS, Next.js API routes and PostgreSQL via Supabase.

## Features

- Responsive landing page and dashboard.
- Create, edit, delete and publish forms.
- Question types: short text, email, multiple choice, and yes/no.
- Required-question and email validation.
- Reorder questions and customize welcome/completion text and accent color.
- Public form links at `/forms/[id]`.
- Floating website embed widget using `public/widget.js`.
- Saved submissions with timestamps and dashboard response view.
- Supabase/PostgreSQL persistence, with in-memory fallback for a quick local demo.

## Requirements

- Node.js 20 or newer
- npm
- Optional: Supabase project for persistent database storage

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Supabase credentials, the app uses in-memory demo storage. Data resets when the development server restarts. For persistent storage, configure Supabase as below.

## Configure Supabase

1. Create a project at https://supabase.com.
2. Open **SQL Editor** in the Supabase dashboard.
3. Run the contents of `supabase/schema.sql`.
4. Copy your project URL and service-role key from the project API settings.
5. Put them in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

6. Restart the Next.js server.

**Security note:** the service-role key bypasses row-level security. It is used only in server-side code in this MVP and must never be prefixed with `NEXT_PUBLIC_` or committed to Git. Before a production launch, add authentication, ownership checks, rate limiting, spam protection, and appropriate row-level security policies.

## Use the app

1. Open `/dashboard`.
2. Choose **Create form**, add a title and questions, then save.
3. Toggle **Publish form** and save.
4. Use **Copy public link** to share `/forms/[id]`.
5. Use **Copy embed code** to get a snippet like:

```html
<script src="https://YOUR-DEPLOYED-DOMAIN/widget.js" data-form-id="YOUR-FORM-ID" defer></script>
```

6. Paste the snippet before `</body>` on a test website. The floating button opens the form in an embedded panel.
7. Submit a response and view it from the **Submissions** tab in the dashboard.

## Validation and API

- `GET /api/forms` — list forms
- `POST /api/forms` — create/update a form
- `GET /api/forms/[id]` — get a form
- `DELETE /api/forms/[id]` — delete a form and related submissions
- `GET /api/submissions?formId=...` — list submissions
- `POST /api/submissions` — validate and save a submission

## Git and GitHub

```bash
git init
git add .
git commit -m "Build Formly interactive form MVP"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Create an empty GitHub repository first. Do not commit `.env.local`.

## Deploy to Vercel

1. Push the project to GitHub.
2. Import the repository into https://vercel.com.
3. Add `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_APP_URL` in Vercel project environment variables.
4. Deploy. Run the SQL schema in Supabase before testing persistence.
5. Test creating a form, publishing it, opening its public URL, submitting a response and checking the dashboard.

A deployed demo URL is not included because deployment requires your own GitHub/Vercel/Supabase accounts and credentials.
