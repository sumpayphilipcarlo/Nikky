# Voice and active-context security

Nikky treats wake word, speaker verification, and active-window/screen context as native capabilities with explicit user permission.

## Wake word

`core/wake-word.js` manages lifecycle only. A platform-specific engine must supply local/native wake-word detection. Starting the engine requires microphone permission. Wake-word detection does not itself authorize privileged actions.

## Speaker verification

`core/speaker-verification.js` supports optional enrollment and confidence-threshold verification through an injected matcher. The core does not ship or claim a biometric voice model. High-risk actions may require a recent successful verification in addition to the normal Authority Engine decision; speaker verification never replaces account authentication or explicit approval when policy requires it.

## Active context

`core/active-context.js` requires an explicit permission callback and a platform adapter before it can read active-window/document context. Its memory sanitizer excludes selections and URLs by default. Native clients must expose clear permission controls and indicators.

## Native bridge

`core/native-bridge.js` denies undeclared capabilities and identifies sensitive capabilities that require explicit permission. Privileged external provider actions continue to execute only through Nikky Core.
