---
name: linear-oauth
description: Add, port, debug, or explain Linear OAuth sign-in and Linear API authentication in Glaze apps. Use when the user asks to connect Linear, sign in with Linear, access Linear issues/projects/teams/workspaces, call the Linear GraphQL API as the user, or port Raycast OAuthService.linear usage.
---

# Linear OAuth

Use this skill for Linear-specific OAuth setup in Glaze apps. First read `../glaze-oauth/SKILL.md` for the generic OAuth architecture, IPC pattern, token storage, UI guidance, and troubleshooting. This skill only covers the Linear preset.

## Preferred API

Use the built-in Linear OAuth client from `@glaze/core/oauth`:

```typescript
import { OAuthService } from "@glaze/core/oauth";

export const linearOAuth = OAuthService.linear({
  scope: "read write",
});
```

The preset uses Glaze's hosted Linear OAuth proxy. Do not ask the app maker to create a Linear OAuth app, paste a Linear client ID, or handle a Linear client secret for normal Glaze app development.

## Raycast Porting Notes

Raycast extensions that use `OAuthService.linear({ scope })` from `@raycast/utils` should usually map directly to Glaze's `OAuthService.linear({ scope })`. Keep the same scope string unless the app's behavior has changed.

Do not port Raycast's lower-level `OAuth.PKCEClient` setup for the Linear preset. Glaze creates the PKCE client internally and uses Glaze-hosted Linear authorize/token endpoints.

## Scopes

Ask for the narrowest scopes needed for the requested Linear feature.

Common scopes:

- `read` for reading the user's Linear data. Include this by default.
- `write` for broad write access.
- `issues:create` for creating issues and attachments.
- `comments:create` for creating issue comments.
- `timeSchedule:write` for creating and modifying time schedules.

Do not request `admin` unless the user explicitly needs admin-level Linear endpoints.

The preset authorizes as the user (`actor=user`). Do not use this preset for app-actor or service-account style workflows unless Glaze explicitly adds support for those flows.

## Backend Pattern

Create the service in backend code and expose user-initiated actions through IPC.

```typescript
// main/services/linear-oauth.ts
import { OAuthService } from "@glaze/core/oauth";

export const linearOAuth = OAuthService.linear({
  scope: "read write",
});
```

```typescript
// main/handlers/linear.ts
import { ipcMain } from "@glaze/core/backend";
import { linearOAuth } from "../services/linear-oauth";

export function registerLinearHandlers() {
  ipcMain.handle("linear:connect", async () => {
    await linearOAuth.authorize();
    return { connected: true };
  });

  ipcMain.handle("linear:disconnect", async () => {
    await linearOAuth.removeTokens();
    return { connected: false };
  });

  ipcMain.handle("linear:getViewer", async () => {
    const accessToken = await linearOAuth.getAccessToken();
    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "{ viewer { id name email } }",
      }),
    });

    if (!response.ok) {
      throw new Error(`Linear request failed: ${response.status}`);
    }

    return response.json();
  });
}
```

Call the handler registration from the app's existing backend handler setup.

## Frontend Pattern

Trigger OAuth from a user action. Use the app's existing UI states for connecting, connected, disconnected, loading, and error handling.

```tsx
import { Button } from "@glaze/core/components";

export function LinearConnectButton() {
  async function connect() {
    await window.glazeAPI.glaze.ipc.invoke("linear:connect");
  }

  return <Button onClick={connect}>Connect Linear</Button>;
}
```

## Do Not

- Do not store Linear tokens in localStorage or plaintext files. `OAuthService.linear` stores tokens through Glaze's secure token store.
- Do not include `clientId`, `clientSecret`, `authorizeUrl`, or `tokenUrl` when using the preset.
- Do not ask users to configure redirect URLs, tunnels, or Linear OAuth credentials for the built-in preset.
- Do not request broad scopes when targeted scopes such as `issues:create` or `comments:create` are enough.

## Troubleshooting

If authorization opens but token exchange fails, check that the app is using `OAuthService.linear` rather than a custom `OAuthService` with raw Linear URLs.

If Linear returns insufficient permissions, adjust the `scope` value and re-authorize. Use the smallest additional scope that unlocks the requested feature.

If the browser flow does not return to the app, use the generic `glaze-oauth` troubleshooting steps.
