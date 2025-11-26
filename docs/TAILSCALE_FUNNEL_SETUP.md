# Tailscale Funnel Setup Guide

This guide explains how to expose your application using **Tailscale Funnel** running directly inside Docker.

## Prerequisites

1.  **Tailscale Account**: You need a Tailscale account.
2.  **Auth Key**: You need a **Reusable Auth Key** from the [Admin Console](https://login.tailscale.com/admin/settings/keys).
    *   **Important**: Ensure the key has the `funnel` attribute enabled (or enable Funnel in your ACLs).

## How It Works

We run two dedicated Tailscale containers side-by-side with your application:
*   `tailscale-frontend`: Exposes the frontend service
*   `tailscale-backend`: Exposes the backend service

Each container gets its own unique hostname on your Tailnet (e.g., `v2capsule-frontend` and `v2capsule-backend`).

## Setup Instructions

1.  **Deploy Application**:
    ```powershell
    .\scripts\deploy-complete.bat
    ```

2.  **Configure Funnel**:
    ```powershell
    .\scripts\setup-tailscale-funnel.bat
    ```
    *   You will be prompted to enter your **Tailscale Auth Key**.
    *   The script will automatically configure `tailscale serve` and `tailscale funnel` for both services.

## Accessing Your App

After setup, the script will display your public URLs. They will look like:

*   **Frontend**: `https://v2capsule-frontend.tailnet-name.ts.net`
*   **Backend**: `https://v2capsule-backend.tailnet-name.ts.net`

## Updating Environment Variables

Once you have your public URLs, update your `.env` file:

```env
NEXT_PUBLIC_API_URL=https://v2capsule-backend.tailnet-name.ts.net
CORS_ORIGIN=https://v2capsule-frontend.tailnet-name.ts.net
```

Then restart your application:
```powershell
docker-compose restart frontend backend
```

## Troubleshooting

### Funnel Not Working
*   **Check ACLs**: Ensure "Funnel" is enabled in your Tailscale Access Controls.
*   **Check Status**:
    ```powershell
    docker exec v2capsule-ts-frontend tailscale status
    docker exec v2capsule-ts-frontend tailscale serve status
    ```
*   **HTTPS Issues**: Tailscale automatically provisions SSL certificates. It may take a minute to become active.

### "Funnel not allowed"
If you see an error saying Funnel is not allowed, check your Tailscale Admin Console > Settings > Feature Previews (if applicable) or Access Controls to ensure Funnel is enabled for your user/tag.
