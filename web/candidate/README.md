# Tejaskrit — Candidate Panel (Frontend)

This is the **Candidate/Student** dashboard for the hackathon project **Tejaskrit**.

It is built with:
- Vite + React + TypeScript
- shadcn/ui + Tailwind
- Firebase Auth + Firestore (schema aligned to our hackathon DB design)

---

## 1) Quick Start

### A) Install dependencies

```bash
npm install
```

### B) Add Firebase env vars

Copy `.env.example` → `.env` and fill values from Firebase Console:

```bash
cp .env.example .env
```

### C) Run

```bash
npm run dev
```

---

## 2) Firebase Setup Checklist

### Enable Auth
- Firebase Console → Authentication → Sign-in method
  - Enable **Email/Password**
  - Enable **Google**

### Firestore
- Firebase Console → Firestore Database → Create database

### Storage (optional)
- Firebase Console → Storage → Create bucket

---

## 3) Firestore Collections Used (Candidate App)

### `/users/{uid}`
Stores the candidate user document.

### `/users/{uid}/master_profile/main`
Stores master resume/profile.

### `/users/{uid}/recommendations/{jobId}`
Optional (preferred): precomputed job match scores.
If absent, UI falls back to client-side scoring.

### `/jobs/{jobId}`
Jobs aggregated from scraped sources + TPO postings.

### `/applications/{uid}__{jobId}`
Candidate tracker entries (Saved/Tailored/Applied/OA/Interview/Offer/etc.).

### `/applications/{applicationId}/events/{eventId}`
OA / Interview / Deadline / Follow-up events.

### `/resume_generations/{genId}`
Resume generation requests.
> For the hackathon MVP, the app **creates the request**.
> A worker/Cloud Function can process it (generate LaTeX+PDF → upload → update `applications/{id}.tailoredResume.pdfUrl`).

### `/users/{uid}/notifications/{notificationId}`
In-app notifications.

---

## 4) Notes

- This frontend is designed to work cleanly even if you don’t build the worker pipeline.
- Resume generation in this MVP creates a Firestore request record (`/resume_generations`).
- The Chrome Extension will later call:
  - `GET /me` (or Firestore reads) for autofill data
  - `POST /applications/upsert` style behavior (implemented in Firestore helper as idempotent upsert)

---

## 5) Deploy

You can deploy via Lovable, Vercel, or Firebase Hosting.

For Vercel:
- Add the same env vars in Vercel Project Settings.
- Build command: `npm run build`
- Output: `dist`
