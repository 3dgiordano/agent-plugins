# Architecture

Target state: all data access goes through the repository layer (`src/repo.js`); no module builds SQL. The move is done
in steps, one owner at a time - see `docs/plans/`.

- `src/handlers/` - public API, owned by the orders team
- `src/admin/` - back-office tools, owned by the back-office team
- `src/legacy/` - nightly reports, owned by the back-office team
