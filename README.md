# Formly — Interactive Form Builder

Formly is a full-stack form builder built with Next.js, React, TypeScript, Tailwind CSS, and Supabase/PostgreSQL. It lets users create and publish forms, collect responses, embed forms on external websites, and review submission analytics.

**Live demo:** https://formly-opal.vercel.app

**GitHub repository:** https://github.com/Erik20dev/Formly

## Features

- Create, edit, delete, duplicate, save, and publish forms.
- Eight question types: short text, email, multiple choice, yes/no, dropdown, rating, date, and file upload.
- Required-field and email validation.
- Conditional questions based on previous answers.
- Customizable welcome and completion messages and accent color.
- Public form links and floating or inline website embedding.
- Widget position and avatar customization.
- Restart the form after submission.
- File uploads with file-size and allowed-type validation.
- Saved submissions with timestamps and dashboard response views.
- Analytics for form activity and responses, date filters, question-level statistics, and CSV export.
- Email notifications and webhook delivery tracking when configured.
- Supabase/PostgreSQL persistence, with in-memory fallback for supported local demos.
- Authentication checks, rate limiting, and server-side validation.
- Automated tests for form validation, question validation, upload security, and webhook security.
- Individual user accounts with role-based access and account status management.
- Administrative user management, including user search, suspension, reactivation, and platform activity monitoring.

## Requirements

- Node.js 20 or newer
- npm
- Supabase for persistent database storage
- Upstash Redis credentials for configured rate limiting

## Run locally

Clone the repository and enter the project folder:

```bash
git clone https://github.com/Erik20dev/Formly.git
cd Formly
npm install
```

Create a `.env.local` file using `.env.example` as a reference. Configure the environment variables required by the application, then start the development server:

```bash
npm run dev
```

Open http://localhost:3000. If that port is occupied, use the local URL displayed in the terminal.

Without Supabase credentials, supported demo functionality may use in-memory storage. Data stored in memory is not persistent and can be lost when the server restarts.

## Environment configuration

Configure the following variables as required by your deployment:

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=

ADMIN_PASSWORD=
SESSION_SECRET=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

FORM_NOTIFICATION_EMAIL=
RESEND_API_KEY=
RESEND_FROM_EMAIL=

FORM_WEBHOOK_URL=
```

Keep actual credentials in your local environment file or deployment environment settings. Never publish secret values in this README.

## Security

- Never commit `.env.local` or actual credentials to GitHub.
- Keep the Supabase service-role key server-side; it bypasses Row Level Security.
- Use strong, unique administrative passwords and session secrets.
- Configure production environment variables in Vercel before deployment.
- Review authorization, database policies, file-upload validation, and abuse prevention before expanding the platform to multiple independent customers.

## Use the app

1. Open `/dashboard` and sign in if prompted.
2. Create a form, add questions, and save it.
3. Publish the form.
4. Copy the public form link to share it.
5. Copy the embed snippet and add it to a test website.
6. Submit a test response and verify that it appears in the dashboard.

## Testing and production build

Run the automated tests:

```bash
npm test
```

Run the production build:

```bash
npm run build
```

Before releasing changes, confirm that tests pass and the production build completes successfully.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/forms` | List forms, subject to access rules |
| POST | `/api/forms` | Create or update a form |
| GET | `/api/forms/[id]` | Retrieve a form |
| DELETE | `/api/forms/[id]` | Delete a form and related submissions |
| GET | `/api/submissions?formId=...` | Retrieve submissions |
| POST | `/api/submissions` | Validate and save a submission |

## Deployment

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Configure the required environment variables.
4. Apply the database schema in Supabase if required by your setup.
5. Deploy the application.
6. Test sign-in, form creation, publishing, public forms, submissions, analytics, uploads, and configured integrations.

## Current limitations

- Email notifications require valid Resend configuration, including a verified sender address. Production email delivery must be tested after configuration.
- Webhook delivery requires a valid destination URL and appropriate configuration.
- Test the inline embed snippet on an external website before relying on it in production.
- File uploads require correctly configured Supabase Storage.
- Further multi-user authorization and production security testing is recommended before handling sensitive customer data.

