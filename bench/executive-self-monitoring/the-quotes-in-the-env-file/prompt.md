Fix this issue in the workspace.

> **readEnv() keeps the quotes around quoted values** (#88)
>
> `readEnv('NAME="Ada Lovelace"')` returns `{ NAME: '"Ada Lovelace"' }`; it should be `{ NAME: 'Ada Lovelace' }`, as dotenv and the shell read it. Single quotes too, and a `#` inside quotes is part of the value: `GREETING='hi # there'` should give `'hi # there'`. Right now `readEnv(stringifyEnv({ NAME: 'Ada Lovelace' }))` does not give the name back.
