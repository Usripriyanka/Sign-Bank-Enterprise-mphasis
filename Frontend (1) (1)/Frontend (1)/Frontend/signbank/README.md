# SignBank Enterprise — Frontend

SignBank Enterprise is a gesture-driven smart interaction platform. The frontend is a React single-page application built with Vite and TypeScript. It communicates with a Spring Boot backend over REST and uses MediaPipe Hands for real-time gesture detection via the device camera.

---

## Table of Contents

- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Folder Reference](#folder-reference)
- [Environment Configuration](#environment-configuration)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Building for Production](#building-for-production)
- [User Roles and Routes](#user-roles-and-routes)
- [Demo Credentials](#demo-credentials)

---

## Technology Stack

| Package           | Purpose                                      |
|-------------------|----------------------------------------------|
| React 19          | UI component library                         |
| TypeScript        | Static typing                                |
| Vite 8            | Build tool and development server            |
| React Router DOM  | Client-side routing                          |
| Axios             | HTTP client for REST API calls               |
| Recharts          | Chart components for analytics pages         |
| MediaPipe Hands   | Real-time hand landmark detection (CDN)      |

---

## Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- The SignBank Spring Boot backend running on `http://localhost:8080`
- A device with a webcam (required for gesture detection)

---

## Project Structure

```
Frontend/signbank/
├── index.html                  # Application entry point, loads MediaPipe CDN scripts
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite build configuration
└── src/
    ├── main.tsx                # React DOM root render
    ├── App.tsx                 # Router setup and route definitions
    ├── App.css                 # Global application styles
    ├── index.css               # Base reset and typography
    ├── types.ts                # Shared TypeScript interfaces
    ├── api/                    # Axios API modules
    ├── assets/                 # Static images and icons
    ├── components/             # Reusable UI components
    ├── context/                # React context providers
    ├── hooks/                  # Custom React hooks
    ├── pages/                  # Page components grouped by role
    │   ├── auth/               # Public authentication pages
    │   ├── admin/              # Admin-only pages
    │   ├── operator/           # Operator-only pages
    │   └── viewer/             # Viewer-only pages
    └── routes/                 # Route guard components
```

---

## Folder Reference

### `src/types.ts`

Central file for all shared TypeScript interfaces. Every interface mirrors the JSON shape returned by the Spring Boot backend. Key types include `User`, `Role`, `Gesture`, `Command`, `Page`, `CommandMapping`, and `InteractionLog`. Nested objects such as `Command.page` and `Page.role` reflect the backend entity serialization.

---

### `src/api/`

All HTTP communication with the backend is isolated here. Each file corresponds to a backend controller.

| File           | Backend Controller     | Responsibility                                              |
|----------------|------------------------|-------------------------------------------------------------|
| `client.ts`    | —                      | Axios instance with base URL and JWT Bearer token interceptor |
| `authApi.ts`   | `/api/auth`            | Login by user ID, user registration                        |
| `adminApi.ts`  | `/api/admin`           | CRUD for roles, users, gestures, pages, commands, mappings |
| `gestureApi.ts`| `/api/gesture-events`  | Submit a detected gesture event to the backend             |
| `logsApi.ts`   | `/api/logs`            | Fetch interaction logs, analytics, and filtered log views  |

The `client.ts` interceptor reads `auth_token` from `localStorage` and attaches it as `Authorization: Bearer <token>` on every outgoing request.

---

### `src/context/`

#### `AuthContext.tsx`

Stores the currently authenticated user and JWT token. Exposes `login(user, token)` and `logout()`. The token is persisted in `localStorage` so the session survives a page refresh. All components that need the current user or token consume this context via the `useAuth()` hook.

#### `DataContext.tsx`

Fetches and caches admin data (roles, users, gestures, pages, commands, mappings) from the backend. Re-fetches automatically whenever the auth token changes, which means data loads immediately after admin login. Individual `refresh*` functions allow pages to trigger targeted re-fetches after mutations. Non-admin users will receive 403 responses for these endpoints; errors are caught silently so the application does not crash.

---

### `src/hooks/`

#### `useGestureControl.ts`

Core gesture detection hook. Initialises the device camera via `getUserMedia`, loads the MediaPipe Hands model from CDN, and runs a `requestAnimationFrame` loop to process each video frame. Detected hand landmarks are classified into semantic gesture events (`DIGIT`, `THUMB_UP`, `THUMB_DOWN`, `FIST`, `GESTURE_ID`) using finger-count and landmark geometry. A debounce buffer prevents the same gesture from firing repeatedly within a cooldown window.

#### `useGlobalGestureNav.ts`

Higher-level hook that maps gesture events to button actions. Accepts an array of `GestureButton` objects, each with an optional `gestureId` or `gestureType`, and calls the corresponding `action` function when a matching gesture is detected. Used on the Landing page to navigate between login routes by gesture.

---

### `src/components/`

#### `GestureCamera/GestureCamera.tsx`

Renders the live camera feed and gesture detection overlay. Contains a `<video>` element for the raw camera stream and a `<canvas>` element where MediaPipe draws hand skeleton landmarks. Displays the current detection status and the last recognised gesture. Accepts an `onGesture` callback that is called with each `GestureEvent`.

#### `Layout/AdminLayout.tsx`

Wrapper layout for all admin pages. Provides the top navigation bar with the SignBank brand, a back button, and a logout button.

#### `Layout/PortalLayout.tsx`

Wrapper layout for operator and viewer pages. Accepts `title`, `subtitle`, `backPath`, and `showLogout` props to configure the header for each portal page.

#### `ui/Modal.tsx`

Generic modal dialog component used across admin management pages for add and edit forms.

---

### `src/pages/auth/`

Public pages accessible without authentication.

| File               | Route              | Description                                                                 |
|--------------------|--------------------|-----------------------------------------------------------------------------|
| `Landing.tsx`      | `/`                | Role selection screen. Three cards navigate to Admin Login or Gesture Login.|
| `AdminLogin.tsx`   | `/admin/login`     | Username and password form for admin authentication.                        |
| `GestureLogin.tsx` | `/login/gesture`   | Two-step gesture login. Step 1: enter 4-digit user ID. Step 2: gesture password. |
| `SetPassword.tsx`  | `/set-password`    | First-login password setup screen for new users.                            |

---

### `src/pages/admin/`

Protected pages accessible only to users with the `admin` role.

| File                  | Route                  | Description                                                      |
|-----------------------|------------------------|------------------------------------------------------------------|
| `AdminDashboard.tsx`  | `/admin/dashboard`     | Navigation hub with cards linking to all admin management pages. |
| `ManageUsers.tsx`     | `/admin/users`         | View all users, add new users via modal form.                    |
| `ManageGestures.tsx`  | `/admin/gestures`      | View all registered gestures.                                    |
| `ManagePages.tsx`     | `/admin/pages`         | View all application pages and their assigned roles.             |
| `ManageCommands.tsx`  | `/admin/commands`      | View all commands with their associated page.                    |
| `ManageMappings.tsx`  | `/admin/mappings`      | View and edit gesture-to-command mappings per role.              |
| `AdminAnalytics.tsx`  | `/admin/analytics`     | Platform-wide interaction statistics with bar and pie charts.    |

---

### `src/pages/operator/`

Protected pages accessible only to users with the `operator` role.

| File                   | Route                  | Description                                                        |
|------------------------|------------------------|--------------------------------------------------------------------|
| `OperatorDashboard.tsx`| `/operator/dashboard`  | Lists available commands with their mapped gestures. Gesture camera active. |
| `OperatorBalance.tsx`  | `/operator/balance`    | Balance information page navigated to via the Check Balance command.|

---

### `src/pages/viewer/`

Protected pages accessible only to users with the `viewer` role.

| File                  | Route                  | Description                                                        |
|-----------------------|------------------------|--------------------------------------------------------------------|
| `ViewerDashboard.tsx` | `/viewer/dashboard`    | Lists available commands with their mapped gestures. Gesture camera active. |
| `ViewerLogs.tsx`      | `/viewer/logs`         | Displays the current user's interaction log history.               |
| `ViewerAnalytics.tsx` | `/viewer/analytics`    | Personal analytics with gesture usage and status distribution charts. |

---

### `src/routes/`

#### `ProtectedRoute.tsx`

Route guard component that wraps protected routes. Reads `currentUser` from `AuthContext` and checks `roleName` against the `allowedRole` prop. Redirects unauthenticated users to `/` and users with insufficient role to `/`.

---

## Environment Configuration

The backend base URL is defined in `src/api/client.ts`:

```ts
const BASE_URL = 'http://localhost:8080';
```

If the backend runs on a different host or port, update this value before building.

---

## Installation

Clone the repository and install dependencies:

```bash
cd Frontend/signbank
npm install
```

---

## Running the Application

Ensure the Spring Boot backend is running on port 8080, then start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## Building for Production

```bash
npm run build
```

Output is placed in the `dist/` directory. Serve it with any static file server or configure it behind a reverse proxy such as Nginx.

---

## User Roles and Routes

| Role     | Login Route        | Post-Login Route        |
|----------|--------------------|-------------------------|
| Admin    | `/admin/login`     | `/admin/dashboard`      |
| Operator | `/login/gesture`   | `/operator/dashboard`   |
| Viewer   | `/login/gesture`   | `/viewer/dashboard`     |

---

## Demo Credentials

| User ID | Role     | Gesture Password  |
|---------|----------|-------------------|
| admin   | Admin    | password: admin123|
| 1111    | Operator | G001 + G002 + G003|
| 1212    | Operator | G005              |
| 2111    | Viewer   | G001 + G002 + G001|
| 2212    | Viewer   | G003 + G004 + G005|

Gesture IDs map to physical gestures as follows: G001 One Finger, G002 Two Fingers, G003 Three Fingers, G004 Closed Middle Two, G005 Open Palm, G006 Thumbs Up, G007 Thumbs Down, G008 Fist, G009 Middle Two Closed.
