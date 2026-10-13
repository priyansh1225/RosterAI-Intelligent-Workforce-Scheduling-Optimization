# RosterAI Frontend

Standalone React frontend for the existing RosterAI Django REST backend. It lives in `frontend/` so the existing backend and its database remain in place. RosterAI is the product identity; a property name is not configured.

## Run locally

1. Start Django from `backend/` with `python manage.py runserver`.
2. In another terminal, open `frontend/`, run `npm install`, then `npm run dev`.
3. Open the Vite URL shown in the terminal (normally `http://localhost:5173`).
4. Use the **Sign in** page to authenticate through Django's existing staff session when protected scheduling and occupancy endpoints are needed. Return to the RosterAI workspace after signing in.

The Vite development server proxies `/api` and `/admin` to `http://127.0.0.1:8000`; set `VITE_BACKEND_ORIGIN` in `.env.local` if Django runs elsewhere. The backend does not currently expose a product login endpoint or role model. The UI reports permission errors from protected endpoints and does not pretend that a local preview is an authenticated role.

## Connected backend features

- Employee and department directory, including employee creation.
- Daily roster review, draft generation, approval, and publication.
- Occupancy entry and deterministic staffing demand estimates.
- Leave request submission and pending status display.
- Staffing rule setup per department.
- Reports derived only from records returned by the API.

Tasks, staff requests, notifications, leave decisions, and role-specific accounts are not implemented by the current backend. Those screens explain the boundary and do not show fabricated operational data.

## Production configuration

Set `VITE_API_BASE_URL` to the deployed API root at build time. Configure Django `ALLOWED_HOSTS`, HTTPS, CORS, and CSRF trusted origins for the frontend domain. Do not use the Django development server or its development settings in production.

