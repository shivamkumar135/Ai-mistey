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

## Deploy

The deployment configuration targets Render for the API and Vercel for the frontend. Both platforms need this project in a Git repository connected to your hosting account.

1. Push this project to a GitHub repository.
2. In Vercel, import the repository. `vercel.json` configures the Vite build and single-page app routing. Set `VITE_API_URL` to `https://casefile-mystery-api.onrender.com/api`, then deploy to get the frontend's actual production URL.
3. In Render, create a new Blueprint from the same repository and use `render.yaml`. Enter `GEMINI_API_KEY`, `MONGODB_URI`, and the actual Vercel production URL for `CLIENT_URL`. Keep the Gemini key and database URI on the server only.
4. Confirm `https://<your-api-host>/api/health` returns `{ "ok": true }`, then create a mystery on the deployed site.

If Render assigns a different API hostname, update `VITE_API_URL` in Vercel to that host plus `/api` and redeploy the frontend.

Allow the deployed API to connect to your MongoDB Atlas cluster. If Atlas uses an IP access list, configure it to allow connections from the deployed backend. Never commit `server/.env` or add secret values to Vercel's frontend variables.

`GET /api/health` is the backend health check.
