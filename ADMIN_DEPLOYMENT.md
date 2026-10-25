# BonBon Admin

The admin portal is an independent Vite entry point (`admin.html`). It reuses BonBon's font, logo and icons, with a separate admin session. Customer builds on Vercel are unchanged.

## Development

Run `npm run dev:admin` with the API on `http://localhost:5188`.

## Server deployment

The backend's `Backend CI/CD` workflow builds this repository's `main` admin entry, uploads it as a workflow artifact, and publishes it to the server before deploying the API. No new GitHub secret is needed because the frontend source repository is public. After an admin-only frontend change, run the backend workflow manually (`gh workflow run deploy.yml --repo PRN232-BonBon/BonBon-Backend`). Customer changes continue to deploy automatically through Vercel.

Manual deployment alternative:

1. Set `VITE_API_URL=/api` and run `npm run build:admin`.
2. Copy `dist-admin/assets/` into `/opt/bonbon/admin/assets/` on the API server, then copy `dist-admin/admin.html` into `/opt/bonbon/admin/admin.html`. Keep old hashed assets until active browser sessions have expired.
3. Backend production Compose mounts `/opt/bonbon/admin` read-only at `/app/admin`. It serves this build only for the `bonbon-admin.kitsuracloud.com` host. The existing Nginx Proxy Manager host sends both admin and API domains to server port 8080, with TLS terminated at the proxy.

The admin browser uses same-origin `/api` requests, so no extra CORS origin is needed. Production requests should use HTTPS.

Admin accounts are provisioned in the database with a BCrypt password hash and an active Admin role. Passwords are never embedded in the frontend or committed to this repository. API endpoints check both the JWT role and current account/membership status.

Reviewing a pending vehicle is transactional. Approval activates an eligible pending owner role and makes the vehicle Available; rejection records a reason. Repeated or competing reviews return HTTP 409. The public catalog only returns Available vehicles with an active owner.
