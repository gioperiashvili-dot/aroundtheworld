# Around The World

A full-stack travel platform with a React frontend and Node backend for searching flights, hotels, restaurants, and tours.

## Project Structure

```text
frontend/
backend/
```

## Local Setup

### Backend

```bash
cd backend
npm install
```

Copy `.env.example` to `.env`, then fill in the required environment values.

```bash
npm start
```

If no start script is available:

```bash
node server.js
```

### Frontend

```bash
cd frontend
npm install
```

Copy `.env.example` to `.env`.

```bash
npm start
```

## Build Frontend

```bash
cd frontend
npm run build
```

## Deployment

The frontend can deploy to Netlify from `frontend/`.

The backend should deploy separately from `backend/` to Render, Railway, Fly.io, or a VPS.

For Netlify production, set:

```text
REACT_APP_API_BASE_URL=https://your-backend-domain.com
```

For Render production, set:

```text
FRONTEND_URL=https://atwgeo.netlify.app
```

After changing Netlify environment variables, trigger a new deploy/build.
After changing Render environment variables, redeploy the backend service.

## Security

Never commit `.env` files, API keys, admin passwords, tokens, or other secrets.
