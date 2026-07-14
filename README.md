This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Security notes

This project now signs the `auth_token` cookie with an HMAC session token instead of storing `auth_token=true`.

Required production env vars:

```bash
ADMIN_PASSWORD="your-login-password"
ADMIN_SESSION_SECRET="a-long-random-secret"
```

Generate a strong session secret with:

```bash
openssl rand -base64 32
```

Do not commit or share `.env.local`. Supabase Row Level Security should still be enabled for every table that can be modified from the client.

## Update: Random to Project

- Random now pulls from the full filtered idea pool instead of only the visible page.
- Random results open in a full-screen picker.
- Clicking a random card opens `/idea/[id]` for full detail.
- Random ideas are selected for project creation by default.
- Use `Save to Project` to open the project editor with the selected random ideas.

## Recent workflow upgrades

- Home search now matches idea titles, idea descriptions, and game names.
- Create Idea detects normalized duplicate YouTube links across footage and sources, including alternate YouTube URL formats.
- Daily Goal is available from the sidebar and resets progress for each new day while keeping the goal settings.
- Create Video Script supports both drag-to-reorder and removing an idea, which regenerates script content and footage assets.
