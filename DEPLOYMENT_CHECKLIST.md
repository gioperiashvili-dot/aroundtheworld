# Around The World Deployment Checklist

## Frontend production env

Create `frontend/.env.production.local` manually on the VPS or in the build environment before running the production build:

```env
REACT_APP_API_BASE_URL=https://api.aroundworld.ge
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
```

## Backend production env

Create `backend/.env` manually on the VPS:

```env
PORT=5000
CLIENT_ORIGIN=https://aroundworld.ge
CLIENT_ORIGINS=https://aroundworld.ge,https://www.aroundworld.ge
ADMIN_PASSWORD=

SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
BOOKING_REQUEST_TO=info@aroundworld.ge

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_SERVICE_ACCOUNT_JSON=

UPLOADS_DIR=/var/www/aroundtheworld/uploads

RAPIDAPI_KEY=
RAPIDAPI_HOST=tripadvisor16.p.rapidapi.com
SKY_SCRAPPER_HOST=sky-scrapper.p.rapidapi.com
TRIPADVISOR_HOST=tripadvisor16.p.rapidapi.com
```

Use either `FIREBASE_SERVICE_ACCOUNT_JSON` or the separate Firebase Admin fields. If using `FIREBASE_PRIVATE_KEY`, keep newline characters escaped as `\n`.

Use an SMTP app password where the email provider requires it.

Never commit SMTP passwords, Firebase private keys, service account JSON, or any `.env` file.

## Build and restart

```bash
npm install
npm --prefix frontend install
npm run generate:sitemap
npm --prefix frontend run build
node backend/server.js
```

`npm --prefix frontend run build` also regenerates `frontend/public/sitemap.xml`
through the frontend `prebuild` script. Keep `npm run generate:sitemap` in the
manual deploy flow so sitemap changes are visible before the build starts.

For PM2:

```bash
pm2 restart aroundtheworld-api --update-env
```

After `git pull`, run `npm install` again if `package.json` or any lockfile changed.

## SEO files

Before each production frontend build, regenerate the sitemap:

```bash
npm run generate:sitemap
```

After deploy, verify:

- `https://aroundworld.ge/sitemap.xml`
- `https://aroundworld.ge/robots.txt`

Confirm sitemap tour detail URLs use slugs, not UUIDs, and that private routes
such as `/AdminPanel`, `/login`, `/register`, `/profile`, `/api/*`, and booking
PDF download URLs are not present.

Submit or resubmit `https://aroundworld.ge/sitemap.xml` in Google Search Console
after deploying sitemap changes.

## Uploads

Set `UPLOADS_DIR` to a directory outside `frontend/public`. Booking PDFs are stored under:

```text
{UPLOADS_DIR}/bookings/{bookingId}/{fileId}.pdf
```

Do not expose the whole uploads directory as static public files. Booking PDFs are private and must not be served as public static files. Only tour and blog image subfolders are served publicly by Express.

Make sure the backend process user can read, write, and delete files in `UPLOADS_DIR`:

```bash
mkdir -p /var/www/aroundtheworld/uploads
chown -R <backend-user>:<backend-user> /var/www/aroundtheworld/uploads
chmod -R 750 /var/www/aroundtheworld/uploads
```

## CORS

Set `CLIENT_ORIGIN` or `CLIENT_ORIGINS` to the deployed frontend origins. For production, include:

```text
https://aroundworld.ge
https://www.aroundworld.ge
```

For local development, use:

```text
http://localhost:3000
```

## Safety

Do not commit `.env`, `.env.local`, private keys, SMTP passwords, Firebase service account JSON, or other secrets.

## Smoke tests after deploy

- Register/login with Firebase Auth.
- Submit a booking request as a guest and as a logged-in user.
- Open the admin panel and manage booking requests.
- Convert a request into an active booking.
- Update active/completed/cancelled bookings.
- Upload a booking PDF as admin.
- Download the PDF from the matching user's profile.
- Confirm a different user cannot download that PDF.
- Delete the PDF as admin.
