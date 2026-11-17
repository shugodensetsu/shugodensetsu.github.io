# DON!!でんパーティー — rules for working on this repository

## Absolute rule: nothing ever scrolls

The owner's most important UI rule. Read it before every change.

- No screen, overlay, dialog, panel, list or page of the app may need scrolling — at any phone size (from 320×568 up),
  in portrait or landscape, in the browser or on the home screen.
- If content does not fit, do not add scrolling. Make it fit (layout, sizes that follow the screen height, shorter
  text), or split it into pages / tabs / steps the player moves through with buttons.
- `overflow: auto` / `overflow-y: auto` / `overflow: scroll` on anything that can actually overflow is a bug.
  `overflow: hidden` that cuts content off is also a bug: everything must stay readable and tappable.
- Text must never overlap other text or controls. Keep the wording short enough to fit.
- After any UI change, check the changed screens at 320×568, 375×667, 390×844 and 844×390 for overflow and overlap
  (see the audit script in the maintainer's work folder, or measure scrollHeight vs clientHeight of every element).

## Other standing rules

- Security first: every proposal and change considers security; secrets (API keys, passwords) are never pasted in
  chat or committed. Payments use a restricted Stripe key kept in GitHub Secrets.
- Replies to the owner are in Japanese.
