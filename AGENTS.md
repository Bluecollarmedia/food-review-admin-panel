# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Notable in this project: the request middleware lives in `src/proxy.ts` and exports a `proxy` function (not `middleware.ts` / `middleware`).
