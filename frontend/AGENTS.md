<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# KhayaOS Frontend Agent Rules

**Mandatory:** Read `../docs/IMPLEMENTATION_STANDARD.md` before any change.

- Extend existing components and services — do not create parallel UI or API layers.
- Ship complete features only (types → services → pages/components → passing `npm run build`).
- Match KhayaOS design: Anek font, existing Card/Button/Modal patterns, platform dark + customer warm palettes.
- Enforce limits and permissions via backend APIs; never rely on hiding nav items alone.
- Reference implementation: Phase 1.0.2 (`ffa9d2f`) — platform pricing/features/billing pages and `UpgradeLimitModal`.
