# Workflows

This directory is intentionally managed by Azure Static Web Apps integration.

After recreating/re-linking the Static Web App in Azure Portal, Azure should generate an
`azure-static-web-apps-*.yml` workflow here automatically.

Do not add a separate deploy workflow that conflicts with Azure-triggered deployments.

## Upload iOS build (BF_CLIENT_v813_IOS_UPLOAD)

`ios-upload.yml` builds the iPhone/iPad app on a GitHub Mac and uploads it to App Store Connect. It only runs when
started by hand (Actions > Upload iOS build > Run workflow) and needs the repository secrets `ASC_KEY_ID`,
`ASC_ISSUER_ID` and `ASC_KEY_P8` (an App Store Connect API key with the Admin role, from the company account).
