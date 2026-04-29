<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# BayData Web Agent Rules

`web/` is the real Next.js application and git repository. Run Web commands from this directory unless a task explicitly targets the parent workspace.

## Fast Reading Contract

BayData's active product is the `web/` Next.js App Router app. Start every web task from the smallest route, component, hook, or API slice that can explain the behavior. Avoid broad repository scans unless the first narrow pass cannot identify ownership.

Use this file as the project-local AI reading map: it tells agents where state lives, where UI lives, where API contracts live, and which files should stay thin.

## Current Split Architecture

- Route files under `src/app/**/page.tsx` should stay as thin containers: route params, high-level hook calls, and page composition only.
- UI belongs in `src/components/<domain>/`. Prefer domain folders such as `workbench`, `create`, `admin`, `dashboard`, and `auth`.
- Client state and behavior belong in `src/lib/<domain>/use-*.ts`.
- Shared types, formatters, parsers, and small helpers belong in `src/lib/<domain>/`.
- Business TS/TSX files should normally stay around 300-400 lines. If a file grows beyond that, split by responsibility before adding more behavior.
- `src/app/globals.css` is the global theme and token entry. Do not split or redesign it during behavior-only tasks.

## Multi-Agent Mode

When the user asks for multi-agent work, parallel work, broad optimization, UI plus API changes, database plus route changes, or a failing flow that needs diagnosis and verification, use a coordinator-led multi-agent workflow.

Keep tiny one-file fixes single-agent. The goal is token savings and higher confidence, not ceremony.

### Coordinator

- Check `git status --short` before editing and protect unrelated user changes.
- Assign exact write ownership before any worker edits files.
- Keep the final integration local: review diffs, resolve overlaps, run verification, and report one coherent result.

### Explorer

- Read-only role for locating route groups, components, API handlers, Prisma models, docs, and existing patterns.
- Report exact paths and line-level risks. Do not edit files.
- Prefer narrow searches in `src/app`, `src/components`, `src/lib`, and `prisma`.

### Worker

- Edit only the assigned write set.
- Assume other people or agents are editing nearby files; never revert unrelated changes.
- If a required change crosses ownership, stop and report the needed file instead of modifying it.

### Verifier

- Run the smallest useful checks first, then broaden when the change touches shared behavior.
- Default checks: `npm run lint` and `npm run build`.
- UI changes should also be checked in a browser or with a screenshot when a dev server is available.

## Common Ownership Splits

- Dashboard UI: `src/app/dashboard/**`, `src/components/dashboard/**`, related CSS in `src/app/globals.css`
- Auth UI/API: `src/app/login`, `src/app/register`, `src/app/forgot-password`, `src/app/api/auth/**`, `src/components/auth/**`, `src/lib/auth/**`
- AI routes and prompts: `src/app/api/ai/**`, `src/lib/ai/**`, `src/lib/client/chapter-generation.ts`
- Workbench and chapters: `src/app/api/works/**`, `src/app/dashboard/work/**`, `src/components/workbench/**`, `src/lib/workbench/**`
- Create flow: `src/app/dashboard/create/**`, `src/components/create/**`, `src/lib/create/**`
- Admin: `src/app/dashboard/admin/**`, `src/app/api/admin/**`, `src/components/admin/**`, `src/lib/admin/**`, `src/lib/config/**`
- Data model: `prisma/schema.prisma`, `prisma/migrations/**`, `src/lib/prisma.ts`

Do not split two workers across the same route group or component file. Prefer one worker per route family.

## Search And Editing Rules

- Start from concrete paths. Avoid broad scans of `node_modules`, `.next`, `output`, `.playwright-cli`, and logs.
- Only enter `node_modules/next/dist/docs/` to confirm Next.js 16 behavior before changing framework-sensitive code.
- In PowerShell, use `-LiteralPath` for bracketed routes such as `src/app/dashboard/work/[id]`.
- Keep user-visible Chinese copy centralized when an existing copy/config file already owns it.

## High-Frequency Entrypoints

### Auth

- Login page: `src/app/login/page.tsx`
- Auth UI: `src/components/auth/`
- Login API: `src/app/api/auth/login/route.ts`
- Logout API: `src/app/api/auth/logout/route.ts`
- Auth helpers and session utilities: `src/lib/auth/**`

### Dashboard Home

- Dashboard route: `src/app/dashboard/page.tsx`
- Dashboard client wrapper: `src/components/dashboard/dashboard-client.tsx`
- Dashboard layout and work list UI: `src/components/dashboard/dashboard-shell.tsx`, `src/components/dashboard/dashboard-works-section.tsx`
- Dashboard behavior hook: `src/lib/dashboard/use-dashboard-client.ts`

### Create Flow

- Create route container: `src/app/dashboard/create/page.tsx`
- Create UI: `src/components/create/`
- Create state and helpers: `src/lib/create/use-dashboard-create.ts`, `src/lib/create/dashboard-create-types.ts`, `src/lib/create/dashboard-create-utils.ts`
- Outline flow route and logic: `src/app/dashboard/create/outline/page.tsx`, `src/lib/create/outline-flow.ts`

### Workbench And Chapter Editor

- Work page route container: `src/app/dashboard/work/[id]/page.tsx`
- Chapter editor route container: `src/app/dashboard/work/[id]/chapter/[index]/page.tsx`
- Workbench UI components: `src/components/workbench/`
- Work dashboard behavior: `src/lib/workbench/use-work-dashboard.ts`
- Chapter editor bootstrap and state: `src/lib/workbench/use-work-chapter-editor.ts`
- AI generation behavior: `src/lib/workbench/use-chapter-editor-ai.ts`
- Chapter metadata behavior: `src/lib/workbench/use-chapter-editor-meta.ts`
- Chapter navigation and command behavior: `src/lib/workbench/use-chapter-editor-navigation.ts`
- Workbench types and formatting helpers: `src/lib/workbench/`

### Admin

- Admin dashboard route: `src/app/dashboard/admin/page.tsx`
- User management route: `src/app/dashboard/admin/users/page.tsx`
- AI model route: `src/app/dashboard/admin/ai-model/page.tsx`
- Admin UI components: `src/components/admin/`
- Admin hooks, types, and helpers: `src/lib/admin/`

### API And Data

- Work and chapter APIs: `src/app/api/works/**`
- Admin APIs: `src/app/api/admin/**`
- AI APIs and adapters: `src/app/api/ai/**`, `src/lib/ai/`
- Prisma schema and migrations: `prisma/schema.prisma`, `prisma/migrations/`
- Shared client utilities: `src/lib/client/`

### Theme

- Theme controls: `src/components/theme/theme-toggle.tsx`, `src/components/theme/theme-config.ts`
- Global tokens and page-wide styling: `src/app/globals.css`

## Analysis Shortcuts

- Save, auto-save, generation state, chapter metadata, and command palette bugs: start in `src/lib/workbench/use-*.ts`, then inspect the matching `src/components/workbench/` surface, then the `src/app/api/works/**` route.
- Visual or layout bugs: start in the relevant `src/components/<domain>/` file, then check `src/app/globals.css` only if the issue is token, theme, spacing, or responsive behavior.
- Database shape or persistence bugs: start with `prisma/schema.prisma`, then inspect the smallest matching API route under `src/app/api/**`.
- Admin bugs: start in `src/lib/admin/`, then `src/components/admin/`, then `src/app/api/admin/**`.
- Create-flow bugs: start in `src/lib/create/`, then `src/components/create/`, then the route container.

## Verification

- For code changes: run `npm run lint`.
- For route, Prisma, build, or framework-sensitive changes: run `npm run build`.
- For visible UI changes: start or reuse a dev server with `npm run dev -- --port 3000` and check the actual page, especially desktop density and mobile fit.
- Useful smoke targets: `http://localhost:3000/dashboard`, `/dashboard/work/[id]`, and `/dashboard/work/[id]/chapter/[index]`.
- If `npm run build` fails on Windows with process-spawn sandbox errors such as `EPERM`, retry the same command with elevated sandbox permission before changing code.

## Ignore During Reading

Do not spend analysis budget on generated or runtime output unless the task is specifically about those artifacts:

- `.next/`
- `node_modules/`
- `output/`
- `.playwright-cli/`
- `*.log`
- `tsconfig.tsbuildinfo`
