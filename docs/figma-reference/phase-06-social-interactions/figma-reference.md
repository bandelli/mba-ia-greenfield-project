---
kind: figma-reference-prefetch
project_plan_phase: "Phase 06 — Social Interactions (Likes, Comments, Subscriptions)"
guessed_slug: social-interactions
captured: "2026-09-13"
updated: "2026-09-14"
figma_file: "https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão"
status: screen-inventory completed (Status: Validated) — all Figma data consolidated, no further Figma MCP calls needed for this phase
---

# Phase 06 — Social Interactions — Figma Reference

**Read `docs/figma-reference/README.md` first.**

**Everything below is now fully consolidated into one file — read that instead of re-deriving from this doc or hitting the Figma MCP:**

📄 **`docs/figma-reference/phase-06-social-interactions/figma-assets/raw/social-interactions-consolidated.RAW.txt`**

It contains, verbatim, every raw Figma code excerpt this phase needs (Like/Dislike button, full Comments section tree, Subscribe button + subscriber count on both screens, Notification bell, and the sidebar row-style reference for the new Followed Channels page), plus the live-validated 13-frame list confirming no dedicated frame exists for this phase's screens, plus pointers to every already-extracted icon asset. Built 2026-09-14 during `/screen-inventory 06`, after live-validating the frame list against Figma (`get_metadata`) — the account's Figma seat hit a rate limit mid-session (cleared on retry).

The screen-by-screen classification (components, verbs, capability coverage) lives in `docs/inventories/screen-inventory-phase-06-social-interactions.md` (`Status: Validated`).

---

## Original pre-collection notes (2026-09-13, superseded by the above)

## No dedicated frame — this phase's UI is embedded in two other phases' frames

Checked the full Figma file's top-level frame list (13 screens total) — there is no frame named anything like "Comments", "Likes", or "Subscriptions". Every capability in this phase's project-plan.md scope is visually present, but living inside frames already captured for other phases:

| Capability (project-plan.md) | Where it actually lives | Reference |
|---|---|---|
| Like/dislike a video | "Video show" frame, channel row's split button | `docs/figma-reference/phase-05-video-watch-page/figma-assets/raw/video-show-39-1013.RAW.txt` (lines ~74–95) + icons `video-like-thumbsup-icon.svg` / `video-dislike-thumbsdown-icon.svg` |
| Comment on a video | "Video show" frame, comments section | same raw file, lines ~162–238 |
| Like/dislike a comment | "Video show" frame, per-comment action row | same raw file, lines ~208–235 + icons `comment-like-icon.svg` / `comment-dislike-icon.svg` |
| Replies to comments (nested) | **Not shown** — the frame has a "Reply" button but no expanded reply thread/nesting depth | Not a fetch gap — the design itself doesn't show it; this is a product decision (how many reply levels, per project-plan.md's own "Points of Attention" section) to make when this phase is planned, independent of Figma |
| Channel subscriptions (follow/unfollow) | "Channel show" frame (Phase 04), action cluster next to the channel name | `docs/phases/phase-04-video-channel-management/figma-assets/raw/channel-show-39-30.reference.txt` — Subscribe button + notification-bell icon button already captured and downloaded there |
| Subscriber count on channel page | Same "Channel show" frame ("2.4M subscribers") + also visible on "Video show"'s channel row ("1.2M subscribers") | Both raw files above |
| Followed-channels area (quick access) | The persistent left sidebar's "Subscriptions" list (Tech Reviews, Gaming Central, etc. + "Show 12 more") — present on every authenticated screen already captured (dashboard, channel settings, home) | Any of the phase-04 or phase-07 raw files; this is shared shell chrome, not phase-06-specific UI |

## What to actually do when Phase 06 is planned

Don't treat this phase as needing a fresh Figma pass — the visual data already exists in the two reference sets above. The real work for `/plan-phase` + `/plan-build` on this phase is almost entirely backend/data-model + wiring (like/dislike toggle state, nested comment storage, follow/unfollow relations) rather than new visual-shell SIs, since no new screens or components are introduced beyond what Phase 04/05 already render. Confirm this assumption at planning time rather than carrying it forward blindly — but as of this pre-collection pass, no counter-evidence was found.
