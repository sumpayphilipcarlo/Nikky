# Nikky

Nikky is a proactive, voice-first Personal AI Executive Assistant and digital companion.

## Product goal

Nikky should work with minimal commands. It should anticipate useful actions from calendar context, routines, weather, traffic, life events, notes, and connected apps, while routing sensitive external actions through an approval policy.

## Current milestone

**Nikky Core v0.3**

- Cross-platform PWA foundation
- Voice-first command interface
- Workday wake / prepare / departure planning
- Weather skill
- Life-event preparation
- Notes / local memory
- Approval Center
- Nikky Skills registry
- Hourly ChatGPT build loop
- 30-minute in-app capability audit while the app is active

## Next priorities

1. Secure Nikky Core reasoning backend
2. Google Calendar integration
3. Gmail integration
4. Live traffic/maps
5. Persistent cloud memory
6. Spotify
7. SMS and voice calling
8. Native wake-word/background services

## Platform target

Web/PWA plus native wrappers for Windows, macOS, Linux, Android and iOS. Nikky's intelligence, memory, permissions and integrations should remain centralized while each OS client exposes the maximum local capability permitted by that platform.

## Security model

The language model must not directly perform privileged external actions. Actions should be converted into structured tool requests, validated by an authority/policy layer, logged, and either executed or placed in Approval Center.
