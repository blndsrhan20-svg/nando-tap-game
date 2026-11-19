# NANDO — Source integration map

This branch keeps NANDO's own application separate from upstream reference projects.

## Linked upstream projects

| Path | Upstream | Intended role | Notes |
|---|---|---|---|
| `vendor/tdlib` | https://github.com/tdlib/td | Cross-platform Telegram client library reference | Native C++; not a drop-in browser script. |
| `vendor/telegram-web-a` | https://github.com/Ajaxy/telegram-tt | Web client architecture and UX reference | Standalone web client; requires its own Telegram API credentials and build. |
| `vendor/telegram-web-k` | https://github.com/morethanwords/tweb | Web client architecture and UX reference | Standalone TypeScript web client; not merged into NANDO's UI. |
| `native/telegram-ios` | https://github.com/TelegramMessenger/Telegram-iOS | iOS implementation reference | Native Swift/Xcode project; requires macOS/Xcode to build. |
| `native/telegram-android` | https://github.com/TelegramMessenger/Telegram-Android | Android implementation reference | Native Android/Gradle project; separate from the web app. |
| `vendor/tgcalls` | https://github.com/TelegramMessenger/tgcalls | Voice/video call implementation research | Native C++/WebRTC-related integration work required. |
| `vendor/mtproto-engine` | https://github.com/TelegramMessenger/mtproto-engine | MTProto implementation research | Rust/native engine; not yet connected to NANDO runtime. |

## How to retrieve the linked source trees

Clone this repository and initialize submodules recursively:

```bash
git clone --branch telegram-web --recurse-submodules https://github.com/blndsrhan20-svg/nando-tap-game.git
```

If the repository is already cloned:

```bash
git submodule update --init --recursive
```

## Integration status

- These entries are Git submodule references pinned to upstream commits.
- They do not mean the upstream code has been copied into NANDO's own application bundle.
- NANDO's current `index.html`, `style.css`, and `app.js` remain a local-only prototype.
- No real account system, cross-user messaging, server, push notifications, or production call stack is enabled yet.
- Before copying or distributing upstream code, review the exact license and preserve required notices/source availability.
- NANDO must use its own app identity and credentials. Do not ship Telegram API secrets in browser code.

## Planned NANDO architecture

1. Keep the current web UI as the NANDO presentation layer.
2. Build a separate authenticated backend and database for NANDO users, conversations, membership, and message delivery.
3. Add secure file storage and media processing.
4. Add realtime delivery and push notifications.
5. Evaluate call infrastructure separately; do not claim calls work until devices have passed end-to-end tests.
6. Use upstream projects as references or selected components only after compatibility, security, and license review.
