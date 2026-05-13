# Repository Guidelines

## Project Structure & Module Organization

This repository is a native WeChat Mini Program MVP. App entry files live at the root: `app.js`, `app.json`, and `app.wxss`. Feature screens are under `pages/<feature>/` and follow the Mini Program quartet pattern: `index.js`, `index.wxml`, `index.wxss`, and `index.json` where applicable. Shared domain logic and mock persistence are in `services/`; reusable helpers are in `utils/`. Tab icons and other static assets live in `assets/`. Product and acceptance specs are in `docs/spec/`; update these before implementing larger behavior changes.

## Build, Test, and Development Commands

Use WeChat Developer Tools for local development:

- Import this directory as a Mini Program project.
- Use `project.config.json` for AppID, compiler, and upload settings.
- Run the simulator/preview from WeChat Developer Tools after edits.
- Run `npm test` for repository checks, JS syntax validation, page asset checks, and service-layer smoke tests.

For quick repository inspection, use shell commands such as `git status --short` and `rg "term" pages services utils`.

## Coding Style & Naming Conventions

Use CommonJS modules (`require`, `module.exports`) and modern JavaScript syntax supported by the Mini Program compiler. Keep two-space indentation in JavaScript, JSON, WXML, and WXSS. Prefer descriptive camelCase names for functions and data fields, such as `loadHome`, `getCurrentUser`, and `featuredCommunities`. Keep page event handlers in the matching page `.js` file, service methods in `services/`, and formatting/storage helpers in `utils/`. Match existing WXSS class naming with hyphenated semantic classes such as `hero-title`, `post-card`, and `primary-button`.

## Testing Guidelines

Run `npm test` before committing. It checks JavaScript syntax, JSON parsing, Mini Program page/icon files, and service smoke coverage for profile, community membership/search, posting, comments, reports, urge records, and review records. Also validate visible UI changes manually in WeChat Developer Tools.

## Commit & Pull Request Guidelines

Recent commits use short imperative summaries, sometimes with a conventional prefix, for example `Fix button layout overflow` and `fix: code bugs`. Keep new commits concise and behavior-focused. Pull requests should include a brief description, affected pages/services, manual test notes from WeChat Developer Tools, linked issue or spec reference when available, and screenshots for visible UI changes.

## Security & Configuration Tips

Do not commit real secrets or production cloud identifiers. `CLOUD_ENV_ID` in `app.js` is intentionally empty for local/mock operation; only configure cloud environments through approved project settings.
