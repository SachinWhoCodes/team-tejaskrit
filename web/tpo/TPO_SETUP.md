# Tejaskrit — TPO Panel Setup (Aligned with Candidate Panel)

## 1) Environment variables

This TPO panel uses the **same Firebase project** as the Candidate panel.

Create `.env` from `.env.example` and set:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (optional)

> On Vercel: add the same variables under **Environment Variables** for this TPO app.

## 2) Firebase Auth

Enable:
- Email/Password

(We removed anonymous demo login to avoid confusion / errors.)

## 3) Firestore security rules (IMPORTANT)

To make **Candidate + TPO** work together:
- TPO must be allowed to create institute jobs
- TPO must be allowed to read institute applications
- TPO must be allowed to write candidate notifications

Use the file: `FIRESTORE_RULES_COMBINED.rules` and paste into:
Firebase Console → Firestore Database → Rules.

## 4) How TPO connects to the candidate system

### Institute Binding
- When a TPO logs in and registers their college, we create/update:
  - `/institutes/{instituteId}`
  - `/institutes/{instituteId}/members/{tpoUid}` with role `tpo`
  - `/users/{tpoUid}.instituteId = instituteId`

### Institute Verified Drives
- Drives created by TPO are stored in:
  - `/jobs/{jobId}` with:
    - `source = "tpo"`
    - `visibility = "institute"`
    - `instituteId = {instituteId}`

Candidate panel automatically shows these drives.

### Announcements → Candidate Notifications
- Announcements are stored in:
  - `/institutes/{instituteId}/announcements/{id}`
- Additionally, this TPO app delivers them to candidates as notifications:
  - `/users/{studentUid}/notifications/{id}`

Candidate panel reads these in its Notifications page.

### Applications visibility
- Candidate applications are stored in:
  - `/applications/{uid}__{jobId}`
- Candidate writes `instituteId` into application so TPO can view in:
  - `/applications` where `instituteId == {instituteId}`

## 5) Run locally

```bash
npm install
npm run dev
```
