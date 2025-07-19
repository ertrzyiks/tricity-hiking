# Copilot Instructions

## Package Manager

This project uses **pnpm** as the package manager. Please use pnpm commands instead of npm:

- Use `pnpm install` instead of `npm install`
- Use `pnpm add <package>` instead of `npm install <package>`
- Use `pnpm run <script>` instead of `npm run <script>`

The project is configured with `pnpm-lock.yaml` and includes pnpm-specific configuration in `package.json`.

## Development Commands

- `pnpm run dev` - Start development server
- `pnpm run build` - Build the project
- `pnpm run test` - Run tests
- `pnpm run preview` - Preview the built project