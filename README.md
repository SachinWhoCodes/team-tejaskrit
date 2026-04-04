# Tejaskrit

A multi-surface hiring platform that connects **students/candidates**, **TPOs (Training & Placement Officers)**, **job ingestion services**, and a **Chrome extension** into one Firebase-backed workflow.

Tejaskrit is designed to help candidates discover jobs, generate tailored resumes, track applications, and receive AI-powered recommendations, while giving institutes a dedicated TPO panel to publish verified drives, review applications, and notify students.

---

## Table of Contents

- [Overview](#overview)
- [Core Modules](#core-modules)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Firestore Data Model](#firestore-data-model)
- [Candidate App](#candidate-app)
- [TPO App](#tpo-app)
- [Chrome Extension](#chrome-extension)
- [Python Services](#python-services)
- [AI and Resume Workflow](#ai-and-resume-workflow)
- [Setup Guide](#setup-guide)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Deployment Notes](#deployment-notes)
- [Operational Notes](#operational-notes)
- [Troubleshooting](#troubleshooting)
- [Future Improvements](#future-improvements)

---

## Overview

Tejaskrit combines four parts into a single platform:

1. **Candidate Panel** (`web/candidate`)  
   A React + Vite dashboard for students to discover jobs, manage a master profile, get AI recommendations, generate tailored LaTeX resumes, preview PDFs, and track applications.

2. **TPO Panel** (`web/tpo`)  
   A React + Vite dashboard for institutes to register colleges, publish institute-only drives, review students and applications, and send announcements.

3. **Browser Extension** (`web/web_extension`)  
   A Chrome extension that detects job pages, autofills forms using candidate profile data, writes jobs/applications into Firestore, and connects back to the candidate app for tailored resume generation.

4. **Ingestion Services** (`services/scrap`, `services/telescrap`)  
   Python services that ingest jobs from public career pages and Telegram channels and normalize them into the shared Firestore job schema.

All surfaces are built around a shared Firebase/Firestore data model, so candidates, TPOs, scrapers, and the extension can cooperate on the same records.

---

## Core Modules

### Candidate Panel
- Authentication and onboarding
- Job feed and saved AI recommendation bundle
- Application tracker
- Master profile management
- Tailored LaTeX resume generation
- LaTeX editor with AI assist and PDF preview/download
- Notifications
- Extension integration page

### TPO Panel
- College registration and institute setup
- Institute drive/job creation
- Student view
- Application view
- Analytics dashboard
- Announcements and email notification flow
- Settings and institute management

### Browser Extension
- Job/apply page detection
- Candidate autofill using profile data
- Create/update private jobs in Firestore
- Mark jobs saved/applied
- Trigger tailored resume generation from the candidate app

### Services
- Public career page scraping
- Telegram job extraction using Telethon + Groq classification
- Firestore job deduplication and normalization

---

## Tech Stack

### Frontend
- **Vite**
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
- **Framer Motion**
- **TanStack Query**
- **React Router**

### Backend / APIs
- **Vercel Serverless Functions**
- **Firebase Admin SDK**
- **Groq API** for AI recommendation and resume generation workflows
- **LaTeX.Online** for PDF compilation from LaTeX

### Data Layer
- **Firebase Authentication**
- **Cloud Firestore**

### Services
- **FastAPI**
- **BeautifulSoup**
- **Requests**
- **Telethon**
- **Groq Python SDK**
- **firebase-admin**

### Browser Extension
- **Chrome Extension Manifest V3**
- Background service worker + content script + popup UI

---

## Repository Structure

```text
team-tejaskrit-main/
├── services/
│   ├── scrap/                 # FastAPI scraper for public career pages
│   └── telescrap/             # Telegram-based ingestion with Groq classification
├── web/
│   ├── candidate/             # Candidate panel + Vercel APIs
│   ├── tpo/                   # TPO panel + Vercel APIs
│   ├── web_extension/         # Chrome extension (MV3)
│   └── web_extension.zip      # Packed extension artifact
└── README.md                  # Root project README
```

---

## Key Features

## Candidate-facing
- Secure login and onboarding
- Master profile stored in Firestore
- Public + institute + private job visibility
- Stable AI recommendation bundle saved per user
- Manual recommendation generation via a visible CTA
- Tailored resume generation per application/job
- Resume activity progress modal for long actions
- Resume download as compiled PDF
- Full-screen LaTeX editor with preview and AI assist
- Application tracker with statuses and events
- In-app notifications

## TPO-facing
- Institute registration and configuration
- Institute-only verified drive posting
- Student and application visibility within an institute
- Analytics and dashboard insights
- Announcements stored in Firestore
- Optional email blast support through Brevo

## Platform-wide
- Shared Firestore schema across all surfaces
- Job ingestion from multiple sources
- Extension-driven private jobs and application tracking
- Role-aware access model (`student`, `tpo`, `admin`)

---

## System Architecture

```text
Public Career Pages ─┐
                      ├─> Python Services ──> Firestore /jobs
Telegram Channels  ───┘

Chrome Extension ───────────────────────────────┐
                                                ├─> Firestore /jobs, /applications
Candidate Panel ──> Vercel APIs ────────────────┤
                                                └─> Firestore /users, /recommendations, /resume_generations
TPO Panel ───────> Vercel APIs ─────────────────┘
```

### Candidate recommendation flow
1. Candidate clicks **AI Tejaskrit Recommendation**.
2. Candidate API reads the authenticated user and master profile.
3. Visible jobs are loaded from Firestore.
4. Local scoring + Groq enrichment run server-side.
5. A saved recommendation bundle is written back to Firestore.
6. Dashboard and Jobs page read the saved bundle on future loads.

### Tailored resume flow
1. Candidate clicks **Generate Tailored Resume** for a job.
2. Candidate API fetches the user, master profile, and job.
3. Groq generates a one-page tailored LaTeX resume.
4. The LaTeX is stored in `applications/{applicationId}.tailoredResume.latex`.
5. Candidate can open the LaTeX editor, preview, save edits, and download PDF.

### TPO job flow
1. TPO creates or imports an institute drive.
2. Job is saved in `/jobs` with `source: "tpo"` and `visibility: "institute"`.
3. Eligible candidates see the drive in the candidate portal.
4. TPO can later view applications and announce opportunities.

---

## Firestore Data Model

The codebase is built around a shared Firestore schema.

### Core collections

#### `/users/{uid}`
Stores role, institute mapping, preferences, contact info, and privacy consents.

#### `/users/{uid}/master_profile/main`
The candidate's source-of-truth resume/profile.

#### `/users/{uid}/recommendations/{jobId}`
Per-job recommendation results, including local score, AI score, reasons, and generation metadata.

#### `/users/{uid}/notifications/{notificationId}`
Candidate notification feed.

#### `/jobs/{jobId}`
All jobs across scraped, Telegram, TPO, extension, and manual sources.

#### `/applications/{uid}__{jobId}`
Application tracker entry per user/job pair.

#### `/applications/{appId}/events/{eventId}`
Scheduled events such as OA, interview, deadline, and follow-up.

#### `/applications/{appId}/logs/{logId}`
Action logs such as resume generation events.

#### `/resume_generations/{genId}`
Audit trail of generated tailored resumes.

#### `/institutes/{instituteId}`
Institute record.

#### `/institutes/{instituteId}/members/{uid}`
Institute membership document used by TPO and, optionally, student access logic.

#### `/institutes/{instituteId}/announcements/{announcementId}`
Announcements for institute members.

### Important job fields
- `source`: `scraped | telegram | tpo | extension | manual`
- `visibility`: `public | institute | private`
- `sourceMeta`: origin-specific metadata such as Telegram channel, deadline, or eligibility

---

## Candidate App

Path: `web/candidate`

### Pages
- `/` — Dashboard
- `/jobs` — Job feed and recommendation view
- `/tracker` — Application tracker
- `/resume` — Master profile and tailored resume management
- `/resume/editor/:applicationId` — LaTeX editor
- `/extension` — Extension help/setup page
- `/notifications` — Candidate notification center
- `/login`, `/register`, `/onboarding`

### Important client modules
- `src/contexts/AuthProvider.tsx` — auth state and user document handling
- `src/lib/firestore.ts` — client Firestore access layer
- `src/lib/api.ts` — wrapper around candidate serverless APIs
- `src/components/AiRecommendationButton.tsx` — manual recommendation trigger
- `src/hooks/useResumeActivityProgress.tsx` — progress modal wrapper for resume actions

### Candidate Vercel APIs
- `api/match/generate.ts` — builds/saves recommendation bundle
- `api/match/refresh.ts` — recommendation refresh path
- `api/resume/generate-latex.ts` — tailored LaTeX generation
- `api/resume/ai-assist.ts` — AI assist inside LaTeX editor
- `api/resume/save-latex.ts` — save edited LaTeX
- `api/resume/preview-pdf.ts` — render preview PDF
- `api/resume/pdf.ts` — download compiled PDF
- `api/resume/latex.ts` — serve stored `.tex` for secure compilation

---

## TPO App

Path: `web/tpo`

### Pages
- `/` — Overview dashboard
- `/drives` — Institute jobs/drives
- `/students` — Student directory
- `/applications` — Application view
- `/analytics` — Reporting dashboard
- `/announcements` — Announcement creation and history
- `/settings` — Institute settings
- `/login`, `/register-college`, `/access-denied`

### Important client modules
- `src/auth/RequireAuth.tsx`
- `src/auth/RequireTpo.tsx`
- `src/lib/firestore.ts`
- `src/lib/import-job.ts`
- `src/lib/pdf-import.ts`
- `src/lib/email-notifications.ts`

### TPO Vercel APIs
- `api/send-drive-emails.ts` — send drive alerts via Brevo
- `api/map-imported-job.ts` — normalize imported job content

### TPO setup file
- `web/tpo/TPO_SETUP.md` contains the Firestore rules and institute-setup guidance.

---

## Chrome Extension

Path: `web/web_extension`

The extension allows Tejaskrit to work outside the first-party apps.

### What it does
- Detects job pages and apply forms
- Reads candidate data from the shared Firebase project
- Autofills application forms where possible
- Creates private jobs with `source: "extension"`
- Writes saved/applied application records
- Calls candidate app APIs for tailored resume generation/download

### Important files
- `manifest.json`
- `background.js`
- `content.js`
- `popup.js`
- `config.js`

### Extension requirement
The popup must be configured with the candidate app URL so resume APIs can be called by absolute URL.

---

## Python Services

## `services/scrap`
FastAPI-based scraper for career pages.

### Responsibilities
- Calls public board APIs such as Greenhouse board endpoints
- Extracts job content and tech tags
- Filters/normalizes titles
- Deduplicates jobs using apply URL and deterministic identifiers
- Uploads jobs into Firestore

### Key file
- `services/scrap/main.py`

## `services/telescrap`
Telegram ingestion service.

### Responsibilities
- Joins target Telegram channels using Telethon
- Fetches recent messages
- Sends messages to Groq for strict job-vs-spam classification
- Normalizes valid job messages into the shared Firestore job schema
- Saves jobs with `source: "telegram"`

### Key file
- `services/telescrap/scraper.py`

---

## AI and Resume Workflow

## AI recommendation workflow
The project includes a saved recommendation flow in the candidate panel:
- recommendation generation is explicitly user-triggered
- recommendations are stored in Firestore for reuse
- candidate screens can reuse the saved recommendation set instead of recomputing on every page load

### Recommendation inputs
- candidate master profile
- visible jobs from Firestore
- user preferences
- Groq-based reasoning for score enrichment and match reasons

## Tailored resume workflow
The tailored resume feature currently works like this:
- one tailored resume is generated per application/job pair
- output format is LaTeX
- LaTeX is stored directly in Firestore
- preview/download compiles through LaTeX.Online
- edited LaTeX can be saved back to the application

### Current compile note
The preview endpoint in the current repo sends LaTeX to LaTeX.Online. Very large LaTeX inputs may hit request-length limits, so resumes should stay compact and one-page wherever possible.

---

## Setup Guide

## Prerequisites

### Node / Frontend
- Node.js 18+
- npm

### Python services
- Python 3.10+
- pip

### External services
- Firebase project
- Firestore database
- Firebase Authentication
- Groq API key
- Optional: Brevo account for TPO email notifications

---

## Environment Variables

## Candidate app (`web/candidate`)
Client-side variables from `.env.example`:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

Serverless/runtime variables used by APIs:

```env
FIREBASE_ADMIN_CREDENTIALS_B64=
GROQ_API_KEY=
```

`FIREBASE_ADMIN_CREDENTIALS_B64` must be a base64-encoded Firebase service account JSON.

## TPO app (`web/tpo`)
Client-side variables:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

Serverless/runtime variables:

```env
FIREBASE_ADMIN_CREDENTIALS_B64=
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=
```

## Scraper service (`services/scrap`)

```env
SCRAPER_API_KEY=
```

Also place `firebase_credentials.json` in the service folder or update the code to point to your credentials path.

## Telegram scraper (`services/telescrap`)

```env
API_ID=
API_HASH=
PHONE_NUMBER=
GROQ_API_KEY=
FIREBASE_CREDENTIALS_FILE=firebase_credentials.json
```

---

## Running Locally

## 1) Candidate app

```bash
cd web/candidate
npm install
cp .env.example .env
npm run dev
```

## 2) TPO app

```bash
cd web/tpo
npm install
cp .env.example .env
npm run dev
```

## 3) Career-page scraper

```bash
cd services/scrap
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

## 4) Telegram scraper

```bash
cd services/telescrap
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
python scraper.py
```

## 5) Chrome extension
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `web/web_extension`
5. Configure the candidate app URL in the extension popup

---

## Deployment Notes

## Candidate app
Typical deployment target: **Vercel**

### Required
- Build command: `npm run build`
- Output directory: `dist`
- Runtime env vars: `FIREBASE_ADMIN_CREDENTIALS_B64`, `GROQ_API_KEY`

Because serverless APIs use Firebase Admin, Vercel must have the base64 service-account secret available.

## TPO app
Typical deployment target: **Vercel**

### Required
- Build command: `npm run build`
- Output directory: `dist`
- Runtime env vars: `FIREBASE_ADMIN_CREDENTIALS_B64`
- Optional mail env vars for announcements: `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`

## Python services
Can be deployed independently on any Python host:
- Render
- Railway
- VPS
- Docker container

The scraper service exposes a FastAPI endpoint protected by `x-api-key`.

---

## Operational Notes

## Auth model
- Candidate serverless APIs expect a Firebase ID token in the `Authorization: Bearer <token>` header.
- TPO APIs also rely on Firebase Admin and Firestore-backed role checks.

## Source normalization
Jobs may originate from multiple systems. Candidate and TPO UIs normalize source labels for display (`Career Page`, `Telegram`, `Institute Verified`, `Manual`, `Extension`) based on job source fields.

## Resume storage
This project stores tailored LaTeX directly in Firestore under the application document. This keeps the MVP simple and avoids mandatory object-storage setup, but it also means resumes should remain compact.

## Recommendation stability
The candidate experience is designed around saved recommendation documents/bundles rather than recomputing match scores entirely on every page load.

---

## Troubleshooting

## `Missing env var: FIREBASE_ADMIN_CREDENTIALS_B64`
The serverless APIs cannot access Firebase Admin. Add the base64-encoded service-account JSON to your deployment environment.

## `Missing Authorization: Bearer <firebase_id_token>`
A candidate API was called without the Firebase user token. Ensure authenticated requests include the current user's ID token.

## Candidate can log in but data is missing
Check that:
- Firestore exists
- auth providers are enabled
- the expected user and profile docs are being created

## TPO cannot see institute data
Verify:
- the TPO user has a valid `users/{uid}` document
- `users/{uid}.instituteId` is set
- `institutes/{instituteId}/members/{uid}` exists with role `tpo`
- Firestore rules from `FIRESTORE_RULES_COMBINED.rules` are applied

## Resume preview or PDF compile fails
The current preview/download pipeline depends on LaTeX.Online and valid LaTeX. Common causes:
- broken LaTeX syntax
- unsupported packages
- LaTeX text too large for preview requests
- missing stored `tailoredResume.latex` on the application

## Telegram scraper fails to connect
Check:
- `API_ID`, `API_HASH`, `PHONE_NUMBER`
- session file permissions
- channel access status
- Groq key validity if classification is enabled

---

## Future Improvements

- Move large LaTeX preview generation to a server-hosted `.tex` source flow for better reliability on long resumes
- Add background or scheduled recommendation refreshes for newly added jobs
- Add full recommendation generation history in the candidate UI
- Add Cloud Functions or queues for long-running resume/recommendation jobs
- Add object storage for generated PDF caching
- Expand analytics for recruiter/TPO conversion funnels
- Improve extension autofill heuristics per ATS vendor
- Add end-to-end tests across candidate, TPO, and extension flows

---

## Summary

Tejaskrit is not just a frontend dashboard. It is a coordinated hiring system made of:
- a candidate portal,
- a TPO portal,
- ingestion services,
- and a browser extension,

all sharing a common Firebase/Firestore backbone.

If you are onboarding this project, start with these three paths first:
1. `web/candidate`
2. `web/tpo`
3. `services/*`

Then verify the Firestore schema and environment variables before touching business logic.
