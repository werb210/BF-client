### Deployment workflow

- `.github/workflows/azure-static-web-apps.yml` MUST exist in the BF-client repo.
- Do NOT delete or modify this file.
- Do NOT add a second deploy workflow — Azure Static Web Apps only supports one.
- The `app_location` is `client-app` — do not change this, it points to the
  subdirectory where package.json lives.
- The `output_location` is `dist` — the Vite build output directory.
- If the workflow is accidentally deleted, recreate it from this template and
  ensure `AZURE_STATIC_WEB_APPS_API_TOKEN` is set in GitHub repo secrets.
