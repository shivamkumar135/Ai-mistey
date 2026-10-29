# AI Mystery Room

A full stack mystery game. The Express API generates and validates cases with Gemini, stores progress in MongoDB, and keeps the solution private until accusation.

## Requirements

- Node.js 20+
- MongoDB connection string
- Gemini API key

## Run locally

1. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` and `GEMINI_API_KEY`.
2. Run `npm install` at the project root.
3. Run `npm run dev`, then open `http://localhost:5173`.

The API listens on port 5000 by default. Set `VITE_API_URL` in `client/.env` if the API is hosted elsewhere.

## Deploy step by step

This project uses Render for the API and Vercel for the frontend. The GitHub repository is `shivamkumar135/Ai-Mystery`, on branch `main`.

### 1. Prepare your services and secrets

- Create a MongoDB Atlas database and copy its connection URI.
- Create a **new Gemini API key**. A previous key was detected in a rejected GitHub push, so revoke that old key before deploying.
- Keep both values private. Do not paste them into GitHub files or chat.

### 2. Deploy the API on Render

1. Sign in to Render and choose **New → Blueprint**.
2. Connect `shivamkumar135/Ai-Mystery`, select branch `main`, and let Render read `render.yaml`.
3. When prompted, enter `GEMINI_API_KEY` and `MONGODB_URI`. For the first `CLIENT_URL` value, enter `https://placeholder.vercel.app`; you will replace it after Vercel creates the frontend URL.
4. Create the Blueprint and wait for the API service to finish deploying. Copy its public URL, such as `https://casefile-mystery-api.onrender.com`.
5. Open `https://<your-render-host>/api/health`. It should return `{ "ok": true }`.

If MongoDB Atlas uses an IP access list and Render cannot connect, configure Atlas to allow the deployed backend to connect.

### 3. Deploy the frontend on Vercel

1. In Vercel, choose **Add New → Project** and import the same GitHub repository and `main` branch.
2. Keep the repository root as the project root. `vercel.json` supplies the Vite build command, output folder, and React Router fallback.
3. Add the environment variable `VITE_API_URL` with your Render URL plus `/api`, for example `https://casefile-mystery-api.onrender.com/api`.
4. Deploy, then copy the Vercel production URL, for example `https://ai-mystery-room.vercel.app`.

The production build stops with an actionable error if `VITE_API_URL` is missing.

### 4. Allow the frontend to call the API

1. In Render, open the API service’s environment variables.
2. Change `CLIENT_URL` from the placeholder to the exact Vercel production URL (no trailing slash), then save and redeploy.
3. Open the Vercel site and generate a mystery to confirm the full flow.

### Later updates

Push changes to the connected GitHub `main` branch. Vercel and Render will deploy automatically if their GitHub auto-deploy settings are enabled. For local development, keep secrets in `server/.env`; the example file contains placeholders only.
