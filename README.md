# Draw This

Draw This is a tablet-friendly drawing reference web app. It helps artists quickly find a useful visual reference, enter a distraction-free focus mode, and save references locally for later practice.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Add Unsplash credentials:

   ```bash
   cp .env.example .env.local
   ```

   Set `UNSPLASH_ACCESS_KEY` to an Unsplash API access key.

3. Run the app:

   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` starts the Next.js dev server.
- `npm run build` builds the app.
- `npm run typecheck` runs TypeScript checks.
- `npm test` runs unit and component tests.
