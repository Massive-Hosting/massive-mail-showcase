# Massive Mail Showcase

Feature showcase website for the Massive Mail webmail client. Deployed to GitHub Pages.

## Re-capturing Screenshots

Screenshots are captured from the live webmail at `https://webmail.massive-hosting.com` using Playwright.

```bash
# Install dependencies
npm install
npx playwright install chromium

# Capture all 27 screenshots
npm run capture

# Capture a specific screenshot (by test name)
npx playwright test -g "02 - Three pane" --config=playwright.config.ts
npx playwright test -g "Calendar" --config=playwright.config.ts
npx playwright test -g "Dark mode" --config=playwright.config.ts

# Preview the site locally
npm run serve
# Open http://localhost:8000
```

## Deployment

The site auto-deploys to GitHub Pages on push to `main` via the GitHub Actions workflow.

To manually trigger a deploy: go to Actions → "Deploy showcase to GitHub Pages" → Run workflow.
