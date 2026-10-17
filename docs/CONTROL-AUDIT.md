# Control interaction audit

Confirmed and fixed two pointer-obstruction bugs:

- Full-viewport atlas drag layer was above the Radix dialog's X. Shared Dialog dismiss control now has its own z-50 stacking layer, explicit button type, and 44px target. Browser hit-testing confirmed the button owns its centre; pointer close works on desktop and 390px mobile. Escape also dismisses and returns focus.
- Home's world-bottom decorative band intercepted the illustrated AI companion phone link. The empty band now passes pointer events through while buttons/links remain interactive. Browser hit-testing confirmed the companion link receives the pointer.

Browser verification covered all eight atlas destinations after their transitions, emergency-panel close without location/call/share, fullscreen-map close and Escape, keyboard coordinate disclosure and its visible action target. Inspected visible control centres near the top and lower portions of Home, Routes, Journey, Call, Kit, Reports, Learn, Circle and Welcome. Controls within closed details were excluded from obstruction conclusions; the Reports coordinate action was confirmed reachable after expanding its details.

This audit did not dispatch calls, use GPS/microphone/camera, publish contributions, share data, purchase, reset the user's state, or claim disconnected providers are live. It is not a proof of every possible workflow or external-provider availability.

Validation: TypeScript, targeted lint, 115 tests. Preview: docs/previews/navigation-close-fixed.jpg.
