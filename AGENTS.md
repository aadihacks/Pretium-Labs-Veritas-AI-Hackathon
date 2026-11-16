# Pretium Labs Development Instructions

This file contains permanent project-wide instructions for Codex and every other coding agent working in this repository. Follow these rules for all future work unless the user explicitly overrides a rule for a specific task.

These requirements apply to every existing and future frontend page, state, mode, flow, and component. Do not assume that only the page, device, viewport, or theme currently visible is in scope.

## Project-Wide Development Rules

- Treat responsiveness, cross-platform behavior, accessibility, visual consistency, and regression prevention as core requirements, not optional polish to add later.
- Inspect the relevant HTML, CSS, JavaScript, component structure, and existing design patterns before editing.
- Understand what controls an element's position, dimensions, spacing, alignment, state, interactions, and responsive behavior before changing it.
- Identify shared classes, parent containers, layout rules, design tokens, and other consumers that a change could affect.
- Follow established project patterns when they exist. Do not introduce a new visual convention, component structure, or layout system when an appropriate project pattern already exists.
- Implement the user's requested outcome completely while preserving behavior and appearance outside the requested scope.
- If an instruction in this file conflicts with an explicit instruction in the current user request, follow the user's explicit request for that task only.

## Responsive & Cross-Platform Design

Pretium Labs must be designed as a fully responsive, cross-platform web application. Its visual identity, functionality, hierarchy, and user experience must remain consistent across:

- Windows, macOS, Linux, and ChromeOS.
- iOS and Android.
- Chrome, Edge, Safari, and Firefox.
- Large and standard desktop monitors, laptops, Chromebooks, tablets, and phones.
- Portrait and landscape orientations.

Do not design only for the developer's current screen size or one exact device resolution. Every page and component must adapt fluidly to the available viewport and to widths between common breakpoint targets.

### Responsive implementation

- Prefer CSS Grid, Flexbox, `min()`, `max()`, `clamp()`, `minmax()`, relative units, and appropriate media or container queries.
- Use breakpoints when the layout genuinely needs to change, not to patch one exact device width.
- Avoid excessive fixed pixel dimensions for primary layout. Fixed values are acceptable for intentional details such as borders, icons, minimum touch targets, or measured constraints.
- Do not rely on absolute positioning for primary page layouts unless the design genuinely requires it.
- Use sensible maximum content widths on large displays. Avoid both excessive stretching and large empty areas caused by small-screen-only layouts.
- Do not merely shrink a desktop interface on small screens. Reflow, stack, wrap, or reorganize content where necessary.

### Overflow and content resilience

- Normal pages must not require horizontal scrolling unless the user explicitly requests a horizontally scrollable interface for a specific component.
- Content must remain within its intended container and the supported viewport.
- Long text, usernames, URLs, tables, code, navigation, cards, images, and controls must not unintentionally widen the page.
- Multi-column layouts must collapse or adapt appropriately when space becomes limited.
- Cards should resize or stack instead of overflowing. Padding and gaps may reduce at smaller sizes while preserving readability.
- Important controls must not be clipped, overlapped, or hidden off-screen.

### Typography and media

- Keep font sizes, line heights, line lengths, and spacing readable at all supported sizes.
- Prefer `rem` and responsive sizing such as `clamp()` where beneficial.
- Text must not overlap, clip, or escape its container when the viewport, browser zoom, text size, or content length changes.
- Images, videos, canvases, and other media must preserve their aspect ratio, remain within their containers, scale to available space, and avoid causing overflow.
- Use responsive image techniques where they provide a meaningful benefit.

### Inputs and interaction methods

- Support mouse, trackpad, touchscreen, and keyboard navigation.
- Do not make essential functionality depend exclusively on hover. Provide a touch- and keyboard-accessible equivalent when hover reveals information or controls.
- Keep interactive targets reasonably sized for touch.
- Forms, labels, inputs, buttons, and dialogs must fit within the visible viewport and remain usable with touch and keyboard input.
- Use appropriate HTML input types so mobile devices can provide suitable keyboards where possible.

### Accessibility and browser compatibility

- Preserve semantic HTML, keyboard navigation, visible focus indicators, adequate contrast, control labels, and accessible interactive behavior.
- Do not remove accessibility behavior to make a layout visually cleaner.
- Avoid browser-specific behavior unless necessary.
- Before relying on a newer browser feature, verify reasonable support in current Chrome, Edge, Firefox, and Safari, and add a fallback when necessary.

### Required responsive thinking

For every new or modified component, consider:

1. What happens when its container becomes very narrow?
2. What happens when it becomes very wide?
3. What happens when text or data is longer than expected?
4. What happens on a touchscreen or without hover?
5. What happens when browser zoom or text size increases?
6. What happens when the device orientation changes?

Use these approximate verification targets as test points, not rigid layout boundaries:

- Small mobile: 320-375px.
- Standard mobile: 390-430px.
- Tablet: about 768px.
- Small laptop: about 1024px.
- Laptop/desktop: 1280-1440px.
- Large desktop: 1920px and above.

## UI Regression Prevention

Existing correct layout, styling, behavior, and responsiveness are constraints.

- Do not fix one component by unintentionally moving, resizing, misaligning, restyling, or breaking another component.
- Before editing a page or component, inspect its existing structure and relevant CSS and JavaScript.
- Determine what controls its position, dimensions, spacing, alignment, responsive behavior, and interactions.
- Identify every component that shares the affected classes, containers, parent elements, or layout rules.
- Do not immediately add overrides before understanding the existing cascade and layout system.
- Preserve correct alignment, centering, sizing, spacing, positioning, and responsiveness unless the task explicitly requires changing them.
- Be especially careful when changing `display`, `position`, `width`, `height`, `max-width`, `overflow`, `align-items`, `justify-content`, grid columns, flex direction, transforms, or high-level containers.
- Before changing a parent container, determine the effect on its children and siblings. Do not change a high-level container to solve a problem that can safely be fixed within one child.
- After every significant UI change, inspect the affected page as a whole, including surrounding components and every consumer of changed shared styles.
- A change is unacceptable if it fixes one viewport, mode, theme, or page while breaking another.
- If an implementation introduces a regression, fix the regression before considering the task complete.

When something becomes misaligned, trace the cause upward before moving the element. Determine whether the problem originates in the element, its parent, a shared class, content size, inherited CSS, a breakpoint, flex/grid behavior, or a global style change. Fix the actual cause.

## Global Change Scope Rules

- A requested frontend change applies across the whole site by default wherever the same concept, component, copy, state, or behavior appears.
- Do not assume that the currently shown page, device, viewport, theme, or component instance is the only scope.
- A change is mobile-only, desktop-only, page-only, mode-only, theme-only, or instance-only only when the user explicitly says so or when the product behavior clearly requires that boundary.
- Search for every relevant occurrence before editing. Include static markup, generated markup, templates, shared render functions, styles, tests, accessibility labels, and user-facing states where applicable.
- When a shared component represents the requested concept, update the shared implementation rather than patching only one instance.
- Apply global consistency without changing unrelated elements. "Site-wide" means every relevant occurrence, not permission to redesign adjacent UI.
- Preserve internal identifiers, storage keys, APIs, and DOM contracts unless changing them is required by the request.

## Shared Components & Design System

- Reuse or extend existing shared buttons, cards, navigation bars, headers, sidebars, forms, inputs, page containers, profile elements, modals, typography, colors, spacing rules, CSS variables, and design tokens.
- Inspect similar existing components before creating a new one.
- Avoid introducing slightly different versions of the same UI in different places.
- If several pages use the same visual or behavioral element, create or preserve a reusable implementation instead of independently recreating it.
- A correction to a reusable component should produce consistent behavior everywhere it is intentionally used.
- Use existing design tokens and shared layout primitives before adding isolated values.
- Preserve the established visual language, interaction patterns, and accessibility behavior of the site.

## Layout & CSS Architecture

- Prefer structural layout systems such as Grid, Flexbox, shared containers, and consistent spacing variables.
- Elements that should align should normally derive their alignment from the same container or layout system, not independent manual offsets.
- Avoid unnecessary absolute positioning, transforms used as layout fixes, device-specific offsets, and unexplained magic numbers.
- Do not solve alignment by trial-and-error values such as arbitrary negative margins, `top` offsets, or `translateX()` adjustments unless there is an intentional and documented design reason.
- If a precise value is necessary, base it on a clear design measurement or constraint.
- Do not pile overrides on top of overrides. Avoid chains where one rule causes a shift and later rules compensate for it.
- Inspect the full cascade, including later declarations and media queries, before adding specificity or overrides.
- Fix root causes and keep layout logic understandable, reusable, and maintainable.
- Do not unnecessarily change parent dimensions, grid definitions, flex alignment, margins, padding, gaps, widths, heights, positioning, transforms, or global CSS to solve a local problem.

## Existing Design Preservation

Assume elements the user does not mention are already correct and must remain visually and behaviorally unchanged.

- When changing one thing, preserve the established visual language of the rest of the site.
- Treat approved spacing, alignment, sizing, hierarchy, interactions, animation, and responsive behavior as locked acceptance criteria unless the user asks to change them.
- Do not redesign, reorganize, refactor, or restyle unrelated areas while implementing a requested feature.
- Do not rewrite working UI merely because another implementation is possible.
- Preserve state behavior, navigation, filtering, forms, keyboard support, and other adjacent functionality unless the task explicitly changes them.
- If the repository already contains a correct pattern, follow it instead of inventing a new one.

## Testing & Verification

- The canonical latest-version preview for this repository is `http://127.0.0.1:8766/index.html`. All chats working in this `ui fixes` checkout must use port 8766 for development and browser verification; do not switch to another port or checkout unless the user explicitly requests it. Confirm its served files match the intended checkout and the top-left brand reads `Pretium Labs` with the company logo.

Before reporting a frontend task as complete, verify the requested behavior and the surrounding UI at representative sizes. At minimum, check:

- Phone portrait.
- Phone landscape when relevant.
- Tablet.
- Laptop.
- Desktop and large desktop when layout width is relevant.

Verify all applicable items below:

- No unintended horizontal overflow, clipping, overlap, or off-screen controls.
- Correct alignment, sizing, spacing, and relative positioning.
- Readable typography and resilient long-content behavior.
- Working navigation, forms, dialogs, buttons, and interactions.
- Pointer, touch, and keyboard usability.
- Visible focus behavior and preserved accessibility labels.
- Correct responsive stacking, wrapping, and reflow.
- Media and canvases remain inside their containers and scale correctly.
- Surrounding components remain visually unchanged unless intentionally modified.
- Every page, state, theme, mode, and component affected by shared styles still works.
- Chrome, Edge, Safari, and Firefox compatibility for browser-sensitive changes.
- Browser console health when browser verification is available.

Use the repository's relevant automated checks in addition to visual browser inspection. For changes to the current vanilla JavaScript frontend, this normally includes:

- `node --check script.js` when JavaScript changes.
- Relevant `node --test tests\\*.test.cjs` coverage.
- `git diff --check` for changed files.
- Browser-backed verification at the affected viewport sizes and states.

Automated tests alone do not prove that a visual change is correct. Inspect the rendered result whenever the task affects layout, style, animation, responsive behavior, or interaction geometry.

## Backups Before Potentially Destructive Work

- Before any work that could permanently delete, overwrite, corrupt, or make existing data inaccessible, create a dated, restorable backup of the backend and everything affected by the possible loss. This applies to database migrations, destructive SQL, account deletion, storage changes, destructive file operations, resets, and deployments that could damage persistent data.
- Identify the full impact first, including related records that could be deleted through cascading relationships. For backend work, preserve the relevant backend source and configuration as well as the affected database contents, schema, permissions, policies, functions, and triggers. Include authentication records and stored files when they could be affected. Back up each separate data store; a Supabase export does not back up the app's SQLite database or uploaded file contents.
- Use a database-supported, consistent backup method for running databases. Do not assume that an ordinary file copy of an active database is a valid backup.
- Verify that the backup completed successfully and contains the expected data and structure. Check integrity where supported, document how to restore it, and test restoration in an isolated location when practical. Never test restoration by overwriting the live source.
- Keep the backup separate from the files or database being changed and outside the scope of any deletion or reset. Preserve earlier backups rather than overwriting the only recovery copy. Protect sensitive backup contents; never place them in publicly served folders or commit credentials, account data, or database dumps to Git.
- Before the risky operation, record the backup location, what it covers, and any recovery limitations. Git history, a migration file, a rollback script, a transaction, or an assumed provider backup is not a substitute for a verified recovery copy of persistent data.
- If an adequate backup cannot be created or verified, stop before the potentially destructive operation, explain the specific gap, and ask the user how to proceed. Do not silently proceed with incomplete recovery coverage. Having a backup does not itself authorize an otherwise unapproved destructive action.
- This requirement applies to work with a credible risk of permanent loss or damage; it does not require copying the entire backend for read-only inspection or routine reversible edits to unrelated documentation or UI.

## Minimal-Diff / Avoid Unrelated Changes

- Before editing, record the user's requested outcome and the exact components and properties authorized to change. Existing colors, borders, shadows, typography, dimensions, spacing, and interactions outside that scope are locked.
- Do not silently improve, harmonize, or restyle adjacent UI. If completing the request requires changing an approved property outside its scope, explain the concrete dependency and obtain the user's permission before making that additional change.
- Capture the working-tree status and relevant file baselines before editing. Audit the final changes against those baselines, not only against HEAD, so pre-existing or concurrent changes are not attributed to this task or overwritten.
- For shared CSS, inspect the complete cascade and every affected consumer. Verify the requested state and compare surrounding UI with its baseline; passing tests alone does not establish scope preservation.
- When investigating a regression, reproduce it in the affected page, theme, state, and served checkout before editing. Verify the loaded asset version and winning computed style. Do not guess a replacement color or change a global token to fix one border.
- Attribute a mistake to a chat, timestamp, or model only when Git and saved session records support that attribution. Distinguish the edit time from the commit time and confirmed causes from hypotheses. If the evidence is incomplete, state what remains unverified.
- Prefer the smallest safe change that completely solves the requested problem.
- Keep the diff focused on the user's request.
- Do not refactor unrelated code, redesign unrelated UI, rename unrelated identifiers, reformat unrelated files, or perform opportunistic cleanup.
- Do not touch files that do not need to change.
- Prefer modifying the specific component when the task is local, and the canonical shared component when the requested change is global.
- When several implementations are possible, choose the one that changes the fewest unrelated files and styles, preserves the most existing behavior, introduces the least regression risk, and remains easy to understand and maintain.

## Required Scope Check for Every Change

1. Before the first edit, state the requested change and the surrounding behavior and appearance that must stay unchanged. Identify the relevant files, selectors, and properties before modifying them.
2. Inspect shared selectors and their consumers. A theme update, screenshot comparison, feature removal, or request for consistency does not authorize changing unrelated components. Keep surviving declarations intact during removals unless a necessary dependency requires a change within the authorized scope.
3. Before completion, inspect every task-authored diff hunk against the starting baseline. Each hunk must implement the user's request or a necessary dependency within its scope. Remove your own unrelated changes; preserve changes that predate the task or belong to concurrent work.
4. Compare the rendered target and its surrounding UI with the baseline on port 8766. Check the properties meant to stay unchanged, including borders and colors when shared styles are involved. Report the actual patch scope and verification results. Do not declare completion while an unintended change remains or describe an unperformed visual check as passed.

If a necessary dependency falls outside the authorized scope, describe that specific dependency and ask before changing it. Continue work already authorized by the user; do not request approval again for the requested change itself.

## Definition of Done

A frontend task is complete only when all applicable conditions are true:

- The requested behavior and appearance work as specified.
- Every relevant occurrence across the site has been updated, unless the user explicitly limited the scope.
- Whole-site design and behavioral consistency are preserved.
- No regressions were introduced in surrounding or shared UI.
- Responsive behavior works across mobile, tablet, laptop, desktop, and the widths between the test targets.
- There is no unintended overflow, clipping, overlap, or layout shift.
- Content remains readable and controls remain usable with mouse, trackpad, touch, and keyboard.
- Existing UI not named by the user remains intact.
- Accessibility and browser compatibility are preserved.
- Relevant automated checks and browser-based visual checks pass.
- No old inconsistent implementation or duplicated one-off version remains where a shared update was required.

A feature is not finished merely because it looks correct on the developer's current computer or viewport.

## Security Scan Usage

- Follow [SECURITY_SCANS.md](SECURITY_SCANS.md) for the shared scan profile and per-developer setup. Prefer Standard scans for initial audits and Review changes for diffs; run Deep scans when explicitly requested.
- Before launching a new Deep scan, check the installed limits with `python scripts/configure-security-scans.py --check`. A repository TOML alone does not configure the desktop plugin; explain a missing setup instead of silently using higher default limits.
- The shared `codex-security.low-usage.toml` limits new Deep scans to one worker, no subagents, two audit runs, and one hour of worker execution. These settings do not guarantee an allowance or cap tokens; finalization and patches need additional usage.
- Avoid concurrent or replacement scans. Inspect an interrupted scan first and resume the same scan when active and resumable. Preserve terminal errors, saved findings, and incomplete coverage; never report an interrupted scan as clean or complete.
- Review saved findings and generate, review, apply, and verify fixes one accepted finding at a time. Do not start a scan merely to test these configuration files.

## Security Change Record (Required)

- Read [SECURITY_LOG.md](SECURITY_LOG.md) before investigating or changing authentication, authorization, browser/account storage, API validation, gameplay integrity, rewards, secrets, database permissions, resource limits, or other security boundaries. This is the canonical shared security history for human developers and all coding agents.
- Record every security problem identified, fix, mitigation, accepted risk, rejected solution, and security-relevant configuration or operational change. Update the log during the task and before reporting completion, including investigations that change no code and interrupted scans. Do not launch a scan just to populate the log.
- Reuse the existing stable `SEC-###` entry for the same root cause; append dated updates rather than erasing earlier decisions. Allocate a new unused ID for a distinct issue. Check for concurrent edits before saving, preserve other agents' entries, and update the index and open follow-ups.
- Follow the entry template: plain-language problem; attacker prerequisites and exploitation path; affected data/behavior and impact; chosen solution; why it was selected and alternatives/tradeoffs; affected files; evidence and actual test outcomes; residual risk; and separate implementation, verification, deployment, and workbench status. Record uncertainty explicitly. Explain technical vocabulary. Distinguish recorded historical reasoning from a later maintainer inference.
- A generated patch, applied local fix, passing local test, closed workbench item, database installation, and deployed application are different events. Never infer one from another. Record dates and commits/PRs when supported; do not invent attribution, successful tests, production verification, or an exhaustive/clean scan result.
- Keep this GitHub-ready: use repository-relative source/test links and confirmed commit/PR references. Explain exploit mechanisms without publishing credentials, session tokens, personal/account data, database dumps, private backups, scan handoff/action tokens, or working attack scripts against public services. Keep sensitive evidence in approved private storage and summarize it here. Flag any newly discovered secret exposure before publishing it.
- Include the log update with the corresponding security change in the same commit/PR and the same authorized push, even when committing only selected files. Review and stage this file explicitly when necessary. Pull it with the rest of the repository so other developers/agents receive the history. Do not defer logging to chat memory or an untracked private report.
- This requirement does not install an automatic Git commit/push hook, grant deployment permission, or authorize publishing unrelated working-tree changes. Follow the user's current Git workflow; once a commit/push is authorized, include its relevant security log updates without asking again. If it is deferred, state that the log is local and pending commit/push.
