# Linting & Formatting

Run `pnpm run lint` and `pnpm run format` after any changes to JavaScript or TypeScript files. Fix all errors before committing.

## When to Run

- After modifying any `.js`, `.jsx`, `.ts`, or `.tsx` file
- After adding new components or hooks
- After refactoring code

## When NOT to Run

- Documentation changes (`.md` files)
- Planning or architecture discussions
- Config file changes (unless they're JS/TS)
- Asset changes (images, fonts, etc.)

## Fixing Issues

- Unused variables: prefix with `_` (e.g., `_unusedVar`)
- React hooks issues: follow the error guidance for purity and effect rules
- Import errors: check paths and exports

## Config

ESLint is configured in `eslint.config.mjs` using the flat config format (ESLint 9). Includes:

- TypeScript support via `typescript-eslint`
- React and React Hooks rules
- Next.js specific rules

Prettier is configured in `.prettierrc`:

- Single quotes
- Semicolons
- 2-space indentation
- ES5 trailing commas
