# Validation for the handlers

Every handler in `src/handlers/` validates its `body` before doing anything, from its own JSDoc:

- A field without brackets is required; `[body.x]` is optional (absent or `undefined` is fine, but if present it is checked).
- `{string}` is a non-empty string. `{number}` is a finite number (not a numeric string). `{boolean}` is `true` or `false`. `{'a'|'b'}` is one of those strings.
- `body` that is not an object is `{ status: 400, error: 'invalid body' }`.
- The first failing field, in JSDoc order, returns `{ status: 400, error: 'invalid <field>' }` (for example `invalid email`).
- A valid body goes on to what the handler already returns.
