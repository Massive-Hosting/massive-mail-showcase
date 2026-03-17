# Massive Mail Showcase - task runner

# Install dependencies
install:
    npm install
    npx playwright install chromium

# Capture all 28 screenshots (2x Retina)
screenshots:
    npx playwright test capture-screenshots.ts --config=playwright.config.ts

# Capture a specific screenshot by name pattern (e.g. just screenshots "05")
screenshot pattern:
    npx playwright test capture-screenshots.ts --config=playwright.config.ts -g "{{pattern}}"

# Record the full feature walkthrough video
video:
    mkdir -p video
    npx playwright test record-walkthrough.ts --config=playwright.config.ts

# Recapture everything (screenshots + video)
capture-all: screenshots video

# Preview the site locally
serve:
    python3 -m http.server 8000

# Commit updated assets and deploy (auto-deploys via GitHub Actions on push)
deploy:
    git add screenshots/ walkthrough.mp4 video/
    git commit -m "Update showcase assets" || true
    git push
