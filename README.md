# Formly — Interactive Form Builder with Chatbot Widget

Formly is a responsive full-stack form builder built with Next.js, React, TypeScript, Tailwind CSS, API routes, and Supabase/PostgreSQL.

## Features

- Responsive landing page and admin dashboard.
- Create, edit, delete, save, and publish forms.
- Question types: short text, email, multiple choice, and yes/no.
- Required-question and email validation.
- Reorder questions and customize welcome text, completion text, and accent color.
- Public form links at `/forms/[id]`.
- Floating website embed widget using `public/widget.js`.
- Save submissions with timestamps and view responses in the dashboard.
- Analytics and submission tracking.
- Email notifications and webhook delivery tracking, when configured.
- File uploads with file-size and allowed-MIME-type checks.
- API rate limiting for login, public submissions, analytics, and uploads.
- Supabase/PostgreSQL persistence, with in-memory fallback for supported local demo functionality.
- Automated tests for form validation and webhook security.

## Requirements

- Node.js 20 or newer.
- npm.
- A Supabase project for persistent database storage.
- Upstash Redis REST credentials for configured rate limiting.

## Run locally

Install dependencies:

```bash
npm install
```

Create `.env.local` using `.env.example` as a reference, then configure the required environment variables.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If port 3000 is already in use, Next.js may select another port and display the correct local URL.

Without Supabase credentials, supported demo functionality may use in-memory storage. In-memory data is not persistent and can be lost when the server restarts.

## Environment configuration

Create a `.env.local` file in the project root. Configure the variables required by the features you use:

```env
Create a `.env.local` file in the project root using `.env.example` as a reference:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

ADMIN_PASSWORD=YOUR_STRONG_ADMIN_PASSWORD
SESSION_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_CHARACTERS

UPSTASH_REDIS_REST_URL=https://YOUR_DATABASE.upstash.io
UPSTASH_REDIS_REST_TOKEN=YOUR_UPSTASH_TOKEN

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: enable email notifications by configuring all three
FORM_NOTIFICATION_EMAIL=
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Optional: outgoing webhook
FORM_WEBHOOK_URL=
```

**Security:** Replace the placeholders with your own values. Never commit `.env.local` or share actual secrets. Use strong, unique values for `ADMIN_PASSWORD` and `SESSION_SECRET`. Configure the corresponding production values in Vercel before deploying.

Email notifications require all three email variables. The outgoing webhook URL is optional.

SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000

UPSTASH_REDIS_REST_URL=YOUR_UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN=YOUR_UPSTASH_REDIS_REST_TOKEN
```

Configure any additional authentication, email-provider, or webhook-related variables required by `.env.example` and the relevant application code.

Never commit `.env.local`, service-role keys, Redis tokens, or other secrets to GitHub. Variables containing secrets must not use the `NEXT_PUBLIC_` prefix.

### Supabase setup

1. Create a project at [Supabase](https://supabase.com).
2. Open the SQL Editor in the Supabase dashboard.
3. Run the SQL in `supabase/schema.sql`.
4. Copy the project URL and service-role key from the Supabase project settings.
5. Add the values to `.env.local`.
6. Restart the development server.

### Rate limiting setup

1. Create a Redis database with [Upstash](https://upstash.com/).
2. Copy its REST URL and REST token.
3. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to your environment configuration.
4. Configure the same variables in your deployment environment.
5. Test the protected API routes after deployment.

The application uses rate limits for login attempts, uploads, public submissions, and analytics requests. Routes that require the limiter may reject requests if the rate-limiting service is unavailable.

## Use the app

1. Open `/dashboard` and sign in if prompted.
2. Choose **Create form**, add a title and questions, and save.
3. Publish the form.
4. Copy the public form link and share it.
5. Use **Copy embed code** to obtain a snippet similar to:

```html
<script
  src="https://YOUR-DEPLOYED-DOMAIN/widget.js"
  data-form-id="YOUR-FORM-ID"
  defer
></script>
```

6. Add the snippet to a test website before its closing `</body>` tag.
7. Submit a test response and verify it appears in the dashboard.

## Validation, testing, and build

Run the automated test suite:

```bash
npm test
```

Run the production build:

```bash
npm run build
```

Before releasing changes, verify that the build completes successfully and all tests pass.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/forms` | List forms; requires appropriate access |
| POST | `/api/forms` | Create or update a form |
| GET | `/api/forms/[id]` | Retrieve a form |
| DELETE | `/api/forms/[id]` | Delete a form and related submissions |
| GET | `/api/submissions?formId=...` | Retrieve submissions |
| POST | `/api/submissions` | Validate and save a submission |

Access requirements and validation depend on the endpoint. Public form submissions and uploads must remain accessible to legitimate form respondents while protected administrative operations require appropriate authorization.

## Security considerations

- Administrative API routes use authentication checks.
- API rate limiting helps reduce excessive requests.
- Form submissions are validated on the server.
- Webhook destinations are validated before delivery.
- Uploaded files have size and MIME-type restrictions.

**Important production considerations:**

- The Supabase service-role key bypasses Row Level Security and must remain server-side.
- The current shared admin session does not, by itself, provide individual user accounts, per-user ownership boundaries, or role-based access control.
- MIME-type checks alone cannot prove that an uploaded file's contents are safe.
- Review authorization, database policies, secret management, logging, and abuse prevention before expanding to multiple independent customers.

## Deploy to Vercel

1. Push the project to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Configure the required Supabase and Upstash environment variables.
4. Configure any additional authentication, email, and webhook variables used by the application.
5. Run the database schema in Supabase.
6. Deploy the application.
7. Test sign-in, form creation, publishing, the public form link, submissions, dashboard responses, uploads, and any configured integrations.

Set `NEXT_PUBLIC_APP_URL` to the correct deployed application URL in production.

## GitHub

Repository: [https://github.com/Erik20dev/Formly](https://github.com/Erik20dev/Formly)

To download the project, clone the repository:

```bash
git clone https://github.com/Erik20dev/Formly.git
cd Formly
npm install
```

Create your local environment file, configure the required variables, and follow the setup instructions above.
