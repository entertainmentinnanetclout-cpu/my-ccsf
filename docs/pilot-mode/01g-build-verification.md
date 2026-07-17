# Phase 1.5 — Build Verification

The repository now contains a permanent GitHub Actions workflow:

```text
.github/workflows/ci.yml
```

It runs on:

- pushes to `main`;
- pushes to `feature/**` branches;
- pull requests targeting `main`.

The workflow performs:

1. repository checkout;
2. Node.js 20 setup;
3. `npm ci`;
4. `npm run build`.

The workflow is read-only and does not modify application files, deploy the application, execute Supabase migrations or deploy Edge Functions.
