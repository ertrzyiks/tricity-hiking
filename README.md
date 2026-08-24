# Tricity Hiking

Development:

1. Install dependencies `pnpm install`
2. Run the app `pnpm dev`

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── Card.astro
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                    | Action                                                                                                        |
| :------------------------- | :------------------------------------------------------------------------------------------------------------ |
| `pnpm install`             | Installs dependencies                                                                                         |
| `pnpm run dev`             | Starts local dev server at `localhost:4321`                                                                   |
| `pnpm run build`           | Build your production site to `./dist/`                                                                       |
| `pnpm run preview`         | Preview your build locally, before deploying                                                                  |
| `pnpm run draft2route`     | Convert draft GPX files to new routes                                                                         |
| `pnpm run gpx2json`        | Generate JSON files from GPX routes                                                                           |
| `pnpm run astro ...`       | Run CLI commands like `astro add`, `astro check`                                                              |
| `pnpm run astro -- --help` | Get help using the Astro CLI                                                                                  |
| `pnpm run test:checks`     | Run the [Checkly](https://www.checklyhq.com) synthetic checks (`__checks__/`) against Checkly's cloud runners |
| `pnpm run deploy:checks`   | Deploy the Checkly checks so they start running on their own schedule                                         |

## 🔭 Environment variables

| Variable             | Purpose                                                                                                                                                                                                                                                                                                                                                                     |
| :------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SENTRY_AUTH_TOKEN`  | Auth token used to upload source maps to Sentry during `pnpm run build`. Not required for `pnpm run dev`; source maps just won't be uploaded without it. Create one following [Sentry's auth token guide](https://docs.sentry.io/product/accounts/auth-tokens/#organization-auth-tokens) and set it locally in an untracked `.env` file or as a secret on your deploy host. |
| `CHECKLY_API_KEY`    | Auth for `pnpm run test:checks` / `pnpm run deploy:checks` and the `Deploy Checkly checks` workflow. Create one in your [Checkly account settings](https://app.checklyhq.com/settings/user/api-keys) and set it locally in an untracked `.env` file or as a repo secret.                                                                                                    |
| `CHECKLY_ACCOUNT_ID` | The Checkly account the checks deploy to. Found in your [Checkly account settings](https://app.checklyhq.com/settings/account/general); same places to set it as `CHECKLY_API_KEY`.                                                                                                                                                                                         |

## 📝 Working with Routes

### Creating a new route from a draft

1. Place your GPX file in `src/content/drafts/`
2. Run `pnpm run draft2route` to convert drafts to routes
3. Run `pnpm run gpx2json` to generate JSON files from the GPX files
4. Edit the generated MDX files in `src/content/routes/{route-name}/` to add descriptions
5. Run capture scripts to generate preview images if needed

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
