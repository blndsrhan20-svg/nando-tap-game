# THUNDER Messenger — Product Specification

This document is the implementation contract for THUNDER. The product is an Arabic-first, RTL messenger with its own identity. Telegram is a UX reference only; THUNDER must not imply affiliation or copy proprietary branding.

## Product principles
- Arabic RTL by default; responsive iPhone, mobile, tablet, and desktop layouts.
- Honest states: never display a sent message, uploaded file, call, or notification unless the server/provider confirms it.
- PostgreSQL is the durable source of truth. Realtime events improve delivery but do not replace persisted records.
- Security and privacy are release requirements, not post-launch polish.

## Visual system
- Dark default: `#111827`; secondary surfaces: `#1F2937`; borders: `#374151`.
- Light: `#FFFFFF`; secondary surfaces: `#F3F4F6`.
- Primary blue: `#3B82F6`; success green: `#22C55E`.
- Arabic font fallback stack: Cairo, IBM Plex Sans Arabic, Tajawal, system sans-serif.
- Original SVG lightning mark; PWA metadata and theme colors aligned with THUNDER.
- User-selectable light/dark theme; respect device preference when no preference is saved.

## Delivery phases

### Phase 1 — Core messaging
- Account registration/login, safe password hashing, rate limits and session handling.
- Durable direct conversations and text messages.
- Realtime delivery, typing state, read state, unread counts.
- Responsive RTL chat list and thread; dark/light theme.
- Message pagination and reliable reconnect behavior.
- Acceptance: two separate accounts can exchange persisted messages; refresh/re-login does not lose history; offline sends are never falsely shown as successful.

### Phase 2 — Rich messages and message actions
- S3-compatible object storage, upload authorization, size/type limits, image thumbnails.
- Image/video/document/audio messages and upload progress.
- Reply, reactions, edit, delete, forward, copy, pin and multi-select.
- Search across chats and within a conversation.
- Push notifications after provider credentials and device registration are configured.
- Acceptance: each media type is stored and retrieved from the configured provider; failure and retry states are tested.

### Phase 3 — Groups and channels
- Group membership and roles (owner/admin/member), invitations and revocation.
- Mentions, channel broadcast permissions, view counts and slow mode.
- Chat folders, pinned chats and advanced filters.
- Acceptance: server enforces every permission; unauthorized membership and role changes fail.

### Phase 4 — Calls, privacy and scale
- WebRTC one-to-one audio/video calls with signaling and network recovery.
- E2EE design and independent security review before claiming end-to-end encryption.
- Performance, monitoring, backups, abuse controls and load tests.
- Acceptance: calls pass real-device tests on different networks; security review and recovery drills completed.

## Explicitly not claimed as complete
OTP delivery, password recovery, refresh-token rotation, active-device management, two-step verification, media storage, push, channels, group administration, voice messages, WebRTC calls, E2EE, offline outbox synchronization and production load testing must remain marked unavailable until implemented and verified.

## Current implementation note
The current branch has a Node.js/Express API, PostgreSQL persistence, bcrypt password hashing, JWT sessions, Socket.IO, direct/group conversation primitives, read tracking, typing indicators, and the web PWA shell. This does not yet satisfy the full phase acceptance criteria; two-account end-to-end testing is still required.
