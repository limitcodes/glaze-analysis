---
name: glaze-oauth
description: Implement, port, debug, or explain OAuth 2.0 and PKCE authentication in Glaze apps. Use when the user asks about OAuth, OAuth2, PKCE, browser sign-in, access tokens, refresh tokens, redirect URIs, callback URLs, hosted HTTPS redirects, or porting Raycast OAuthService usage to Glaze.
---

# Glaze OAuth

Use `@glaze/core/oauth` for browser-based OAuth 2.0 flows in Glaze apps. It provides PKCE helpers, opens the provider in the user's browser, receives the callback through Glaze's hosted HTTPS relay, exchanges the authorization code for tokens, refreshes expired access tokens, and stores tokens with `safeStorage`.

For normal app development, use Glaze's hosted redirect endpoint instead of building a local callback server or asking the user to host redirect files.

## Provider Setup

Register this redirect URI in the provider's developer dashboard:

```text
https://www.glaze.app/api/oauth/callback
```

Use the provider's client ID in the app. Prefer public PKCE clients when the provider supports them. If a provider requires a client secret, remember that desktop app secrets are not truly secret; do not present them as private.

Some providers have Glaze-hosted presets that hide provider client credentials from app code:

| Provider | Skill          | API                        |
| -------- | -------------- | -------------------------- |
| GitHub   | `github-oauth` | `OAuthService.github(...)` |
| Linear   | `linear-oauth` | `OAuthService.linear(...)` |
| Slack    | `slack-oauth`  | `OAuthService.slack(...)`  |

Use these presets instead of creating a custom client for the same provider.

## How It Works

```text
Glaze app
  -> opens provider authorization URL in the browser
Provider
  -> redirects to https://www.glaze.app/api/oauth/callback
Glaze OAuth relay
  -> opens the app's native URL scheme, for example <app-scheme>://oauth-callback?...
Glaze app
  -> validates state, exchanges the code, stores tokens
```

The app does not need its own HTTPS domain. The relay only handles the browser-to-app handoff; token exchange still happens in the app backend.

## Backend Usage

Create the OAuth service in backend code, usually under `main/services/`.

```typescript
// main/services/spotify-oauth.ts
import { OAuthService } from "@glaze/core/oauth";

export const spotifyOAuth = new OAuthService({
  providerId: "spotify",
  clientId: "YOUR_SPOTIFY_CLIENT_ID",
  authorizeUrl: "https://accounts.spotify.com/authorize",
  tokenUrl: "https://accounts.spotify.com/api/token",
  scopes: ["user-read-private", "user-read-email"],
});
```

Expose auth actions through IPC handlers.

```typescript
// main/handlers/auth.ts
import { ipcMain } from "@glaze/core/backend";
import { spotifyOAuth } from "../services/spotify-oauth";

export function registerAuthHandlers() {
  ipcMain.handle("auth:connectSpotify", async () => {
    await spotifyOAuth.authorize();
    return { connected: true };
  });

  ipcMain.handle("auth:getSpotifyAccessToken", async () => {
    return spotifyOAuth.getAccessToken();
  });

  ipcMain.handle("auth:disconnectSpotify", async () => {
    await spotifyOAuth.removeTokens();
    return { connected: false };
  });
}
```

Call `registerAuthHandlers()` from the app's existing handler registration file.

## Frontend Usage

OAuth is user-initiated. Put the button in the renderer and call the backend handler over IPC.

```tsx
import { Button } from "@glaze/core/components";

export function SpotifyConnectButton() {
  async function connect() {
    await window.glazeAPI.glaze.ipc.invoke("auth:connectSpotify");
  }

  return <Button onClick={connect}>Connect Spotify</Button>;
}
```

Build app-specific UI with the existing design system. `@glaze/core/oauth` does not provide a prebuilt sign-in view, because each app needs its own connected, disconnected, loading, and error states.

## Provider API Calls and Rate Limits

Treat provider APIs as rate-limited shared resources:

- Cache provider data locally instead of refetching on every render, navigation, or window focus.
- Prefer TanStack Query for renderer data. Set realistic `staleTime` values and consider persisted queries with `@tanstack/react-query-persist-client` when the app benefits from cached data across restarts.
- Persist durable, non-sensitive provider data in the app backend when it is useful offline or expensive to recompute. Do not persist access tokens outside `OAuthService`.
- Deduplicate concurrent requests and batch or page API calls deliberately.
- Handle `429 Too Many Requests`: respect `Retry-After` when present, otherwise use exponential backoff with jitter.
- Avoid tight polling loops. Poll only when the feature truly needs freshness, use conservative intervals, stop when the view is hidden or disconnected, and provide manual refresh when possible.
- Do not generate background jobs that crawl large workspaces, repositories, channels, or histories unless the user explicitly asked for that scope of work and the app has clear throttling.

## API Reference

Import from:

```typescript
import { OAuthService, PKCEClient, OAuthTokenStore } from "@glaze/core/oauth";
```

`OAuthService` is the high-level API most apps should use:

- `authorize()` opens the browser, completes PKCE, stores tokens, and returns tokens.
- `getAccessToken()` returns a valid access token, refreshing it when possible.
- `getTokens()` returns stored tokens or `null`.
- `setTokens(tokens)` stores tokens manually.
- `removeTokens()` signs out locally by deleting stored tokens.
- `OAuthService.withAccessToken(service, handler)` runs a function with a valid access token.

Common options:

- `providerId`: stable storage key, for example `"spotify"`.
- `clientId`: provider client ID.
- `authorizeUrl`: provider authorization endpoint.
- `tokenUrl`: provider token endpoint.
- `refreshTokenUrl`: optional provider refresh endpoint when it differs from `tokenUrl`.
- `scopes`: provider scopes.
- `clientSecret`: only for providers that require it.
- `extraAuthorizationParameters`: provider-specific authorization params, such as `audience`, `prompt`, or `access_type`.
- `extraTokenParameters`: provider-specific token exchange params.
- `tokenHeaders`: extra token request headers.

Advanced options:

- `redirectScheme`: override the native app URL scheme. Most apps should omit this.
- `callbackHost`: override the native callback host. Defaults to `oauth-callback`.
- `relayBaseUrl`: override the hosted relay. Most apps should omit this.
- `authorizationTimeoutMs`: override the browser sign-in timeout.

## Lower-Level PKCE

Use `PKCEClient` directly only when the token exchange needs custom logic that `OAuthService` cannot model.

```typescript
import { PKCEClient } from "@glaze/core/oauth";

const client = new PKCEClient();
const request = await client.authorizationRequest({
  authorizeUrl: "https://provider.example.com/oauth/authorize",
  clientId: "CLIENT_ID",
  scopes: ["read"],
});

const result = await client.authorize(request);
// Exchange result.code with request.codeVerifier yourself.
```

## Token Storage

`OAuthService` stores tokens in the app's `userData` directory using `safeStorage`. Do not duplicate token storage in localStorage or plaintext JSON files.

Use `removeTokens()` for local sign out. If the provider supports token revocation and the app needs it, call the provider's revoke endpoint before or after removing local tokens.

## Troubleshooting

**Redirect URI mismatch:** Confirm the provider dashboard contains exactly `https://www.glaze.app/api/oauth/callback`.

**The browser finishes but the app does not reopen:** Remove any custom `redirectScheme` override unless it is required. Glaze apps normally get their native URL scheme from the runtime; if the default scheme handoff fails, treat it as a Glaze runtime issue rather than asking the app author to add a scheme manually.

**Provider returns `invalid_client` or `unauthorized_client`:** Check the client ID, app status, allowed redirect URI, and whether the provider requires PKCE or a client secret.

**Token refresh fails:** Some providers only return a refresh token on the first authorization or require extra authorization parameters. Check the provider docs for parameters such as `access_type=offline`, `prompt=consent`, provider-specific refresh-token rules, or a separate refresh endpoint that should be passed as `refreshTokenUrl`.

**Provider requires a confidential client:** A desktop app cannot keep a client secret confidential. Use PKCE when the provider supports public clients. If the provider truly requires a backend-confidential exchange, explain that the app needs a trusted backend or first-party OAuth proxy.
