# Appointment Scheduler

Full-stack appointment scheduler using React, Express, MongoDB, and Mongoose.

## Features
- React form built with `useState`
- `useEffect` loads all appointments on page load
- Create, update, and delete update React state from API responses
- Express + Mongoose CRUD REST API
- Required-field schema validation in Mongoose
- Vercel-ready Express serverless API
- REST endpoints: `/appointments`, `/appointments/:id`

## Local setup

1. Install Node.js 18+.
2. Run `npm install`.
3. Create `.env` from `.env.example` and set `MONGODB_URI`.
4. Run the API with `npm start` and the React app with `npm run dev` (for local development, use a proxy or change `API` in `src/App.jsx` to `http://localhost:5000/appointments`).
5. For Vercel, set `MONGODB_URI` in Project Settings > Environment Variables. The frontend calls `/appointments`, which is rewritten to the Express function at `/api/appointments`.
