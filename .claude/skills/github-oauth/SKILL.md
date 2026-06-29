---
name: github-oauth
description: Add, port, debug, or explain GitHub OAuth sign-in and GitHub API authentication in Glaze apps. Use when the user asks to connect GitHub, sign in with GitHub, access GitHub repositories/issues/pull requests/notifications, call the GitHub API as the user, or port Raycast OAuthService.github usage.
---

# GitHub OAuth

Use this skill for GitHub-specific OAuth setup in Glaze apps. First read `../glaze-oauth/SKILL.md` for the generic OAuth architecture, IPC pattern, token storage, UI guidance, and troubleshooting. This skill only covers the GitHub preset.

## Preferred API

Use the built-in GitHub OAuth client from `@glaze/core/oauth`:

```typescript
import { OAuthService } from "@glaze/core/oauth";

export const githubOAuth = OAuthService.github({
  scope: "repo read:user",
});
```

The preset uses Glaze's hosted GitHub OAuth proxy. Do not ask the app maker to create a GitHub OAuth app, paste a GitHub client ID, or handle a GitHub client secret for normal Glaze app development.

## Raycast Porting Notes

Raycast extensions that use `OAuthService.github({ scope })` from `@raycast/utils` should usually map directly to Glaze's `OAuthService.github({ scope })`. Keep the same scope string unless the app's behavior has changed.

## Scopes

Ask for the narrowest scopes needed for the requested GitHub feature.

Common scopes:

- `read:user` for the current user's profile.
- `user:email` for private email addresses.
- `repo` for private repository access.
- `public_repo` for public repository write access only.
- `read:org` for organization/team membership.
- `notifications` for notifications.
- `gist` for gists.

If the app only reads public GitHub data, prefer unauthenticated API requests first. Add OAuth only when the app needs private data, user identity, higher rate limits, or user-specific actions.

## Backend Pattern

Create the service in backend code and expose user-initiated actions through IPC.

```typescript
// main/services/github-oauth.ts
import { OAuthService } from "@glaze/core/oauth";

export const githubOAuth = OAuthService.github({
  scope: "repo read:user",
});
```

```typescript
// main/handlers/github.ts
import { ipcMain } from "@glaze/core/backend";
import { githubOAuth } from "../services/github-oauth";

export function registerGitHubHandlers() {
  ipcMain.handle("github:connect", async () => {
    await githubOAuth.authorize();
    return { connected: true };
  });

  ipcMain.handle("github:disconnect", async () => {
    await githubOAuth.removeTokens();
    return { connected: false };
  });

  ipcMain.handle("github:getViewer", async () => {
    const accessToken = await githubOAuth.getAccessToken();
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub request failed: ${response.status}`);
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

export function GitHubConnectButton() {
  async function connect() {
    await window.glazeAPI.glaze.ipc.invoke("github:connect");
  }

  return <Button onClick={connect}>Connect GitHub</Button>;
}
```

## Do Not

- Do not store GitHub tokens in localStorage or plaintext files. `OAuthService.github` stores tokens through Glaze's secure token store.
- Do not include `clientId`, `clientSecret`, `authorizeUrl`, or `tokenUrl` when using the preset.
- Do not ask users to configure redirect URLs, tunnels, or GitHub OAuth credentials for the built-in preset.
- Do not use GitHub OAuth for unauthenticated public-only API access unless the requested workflow requires the user account.

## Troubleshooting

If authorization opens but token exchange fails, check that the app is using `OAuthService.github` rather than a custom `OAuthService` with raw GitHub URLs.

If GitHub returns insufficient permissions, adjust the `scope` value and re-authorize. Use the smallest additional scope that unlocks the requested feature.

If the browser flow does not return to the app, use the generic `glaze-oauth` troubleshooting steps.
