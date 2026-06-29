---
name: slack-oauth
description: Add, port, debug, or explain Slack OAuth sign-in and Slack Web API authentication in Glaze apps. Use when the user asks to connect Slack, sign in with Slack, access Slack channels/messages/users/search/status/reactions, call the Slack Web API as the user, or port Raycast OAuthService.slack usage.
---

# Slack OAuth

Use this skill for Slack-specific OAuth setup in Glaze apps. First read `../glaze-oauth/SKILL.md` for the generic OAuth architecture, IPC pattern, token storage, UI guidance, and troubleshooting. This skill only covers the Slack preset.

## Preferred API

Use the built-in Slack OAuth client from `@glaze/core/oauth`:

```typescript
import { OAuthService } from "@glaze/core/oauth";

export const slackOAuth = OAuthService.slack({
  scope: "emoji:read search:read",
});
```

The preset uses Glaze's hosted Slack OAuth proxy. Do not ask the app maker to create a Slack app, paste a Slack client ID, or handle a Slack client secret for normal Glaze app development.

## Raycast Porting Notes

Raycast extensions that use `OAuthService.slack({ scope })` from `@raycast/utils` should usually map directly to Glaze's `OAuthService.slack({ scope })`. Keep the same scope string unless the app's behavior has changed.

Slack calls these user-token scopes `user_scope` at the authorization URL level, but Glaze's preset handles that automatically. Do not set `user_scope` manually when using `OAuthService.slack`.

## Scopes

Ask for the narrowest user scopes needed for the requested Slack feature.

Common scopes:

- `emoji:read` for custom emoji.
- `search:read` for search.
- `users:read` for user profile basics.
- `users.profile:read` for richer profile fields.
- `channels:read` for public channel metadata.
- `groups:read` for private channel metadata.
- `channels:history` for public channel messages.
- `groups:history` for private channel messages.
- `im:history` for direct messages.
- `mpim:history` for group direct messages.
- `reactions:read` for reactions.
- `reactions:write` for adding reactions.

Avoid broad history scopes unless the app clearly needs message content. If the app only needs workspace/user metadata, prefer metadata scopes such as `users:read` and `channels:read`.

## Backend Pattern

Create the service in backend code and expose user-initiated actions through IPC.

```typescript
// main/services/slack-oauth.ts
import { OAuthService } from "@glaze/core/oauth";

export const slackOAuth = OAuthService.slack({
  scope: "emoji:read search:read",
});
```

```typescript
// main/handlers/slack.ts
import { ipcMain } from "@glaze/core/backend";
import { slackOAuth } from "../services/slack-oauth";

async function slackApi<T>(method: string, params?: Record<string, string>): Promise<T> {
  const accessToken = await slackOAuth.getAccessToken();
  const url = new URL(`https://slack.com/api/${method}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Slack request failed: ${response.status}`);
  }

  const body = await response.json();
  if (!body.ok) {
    throw new Error(`Slack request failed: ${body.error ?? "unknown_error"}`);
  }

  return body as T;
}

export function registerSlackHandlers() {
  ipcMain.handle("slack:connect", async () => {
    await slackOAuth.authorize();
    return { connected: true };
  });

  ipcMain.handle("slack:disconnect", async () => {
    await slackOAuth.removeTokens();
    return { connected: false };
  });

  ipcMain.handle("slack:getAuth", async () => {
    return slackApi("auth.test");
  });
}
```

Call the handler registration from the app's existing backend handler setup.

## Frontend Pattern

Trigger OAuth from a user action. Use the app's existing UI states for connecting, connected, disconnected, loading, and error handling.

```tsx
import { Button } from "@glaze/core/components";

export function SlackConnectButton() {
  async function connect() {
    await window.glazeAPI.glaze.ipc.invoke("slack:connect");
  }

  return <Button onClick={connect}>Connect Slack</Button>;
}
```

## Do Not

- Do not store Slack tokens in localStorage or plaintext files. `OAuthService.slack` stores tokens through Glaze's secure token store.
- Do not include `clientId`, `clientSecret`, `authorizeUrl`, or `tokenUrl` when using the preset.
- Do not ask users to configure redirect URLs, tunnels, or Slack OAuth credentials for the built-in preset.
- Do not set `user_scope` manually. Pass scopes through the `scope` option.
- Do not request message-history scopes unless the requested app feature needs message content.

## Troubleshooting

If authorization opens but token exchange fails, check that the app is using `OAuthService.slack` rather than a custom `OAuthService` with raw Slack URLs.

If Slack returns `missing_scope` or `not_allowed_token_type`, adjust the `scope` value and re-authorize. Use the smallest additional scope that unlocks the requested feature.

If the browser flow does not return to the app, use the generic `glaze-oauth` troubleshooting steps.
