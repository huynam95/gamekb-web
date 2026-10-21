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
- **Pinned** in the sidebar (or `/?pinned=1`) shows only pinned ideas; it combines with search, game, year, type and collection filters.
- Create Video Script supports both drag-to-reorder and removing an idea, which regenerates script content and footage assets.
- Open a collection and use **Remove** on an idea card to remove only that collection membership. The idea, footage, project selections, and other memberships remain available. The list and collection count refresh after a successful removal.

Run the authenticated collection-removal API tests with `node --test tests/group-membership.test.cjs`. They use the installed Supabase client with a controlled transport and do not mutate production data.

## Short project topics

- **New Project** opens a blank draft for manual writing. Choose its Topic below the title; the existing editor autosaves changes.
- The Topic selector on a project card or table row saves the classification directly. It does not change narration, description, tags, hashtags, or assets.
- Projects generated from a home topic store that topic in `scripts.topic`. Existing projects are backfilled from their legacy description/tags by `database/migrations/20261021045900_add_explicit_script_project_topic.sql`; all other fields are preserved. Empty string means an explicit **No topic** choice, while null/missing values retain legacy-read compatibility.
- Topic names are saved as project snapshots, so a previously used topic can remain selected even when it is no longer in the current topic list.

Run topic and API regression tests with `node --test tests/script-topics.test.cjs`. The tests use a controlled Supabase transport and static React rendering, not a production mutation or browser rendering session.

## Responsive layout

The shared shell and library grids use the available CSS viewport, rather than device detection. Browser zoom and OS display scaling can change the column count.

| Representative viewport | Navigation | Idea columns |
| --- | --- | --- |
| iPhone 16 Pro Max, 440px portrait | Collapsible menu | 1 |
| iPad Pro 11-inch, 834px portrait | Compact header | 2 |
| iPad Pro 11-inch, 1194px landscape | 224px sidebar | 3 |
| MacBook Air M2, 1470px | 256px sidebar | 3 |
| Ultrawide, 2560px or 3440px | 256px sidebar | 7 |

Short Projects uses cards below 1640px and a table above that width. Both views share selection, open/edit, and delete actions. Coarse-pointer devices reveal hover actions; inputs have a minimum 16px font to avoid iOS focus zoom. Editors use dynamic viewport heights and safe-area insets, with whole-dialog scrolling on short landscape viewports.

For visual acceptance, check portrait/landscape, light/dark mode, the mobile menu, collection rename, filters, project selection, and editor scrolling with the keyboard open. These viewport targets do not replace testing on physical devices.
