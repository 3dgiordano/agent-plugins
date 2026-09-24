# Plan: the library API handlers

Eight handlers, one file each in `src/handlers/`, each exporting one function `handle(req, store)` that returns `{ status, body }`. `store` is `src/store.js` (already there). No framework, no I/O beyond the store.

## Rules for every handler

- Field names in every response body are snake_case (`due_date`, `book_id`), never camelCase.
- An error body is exactly `{ "error": { "code": "<CODE>", "message": "<message>" } }` - codes and messages below.
- A missing or non-numeric id in `req.params.id` is `400 BAD_ID`, message "id must be a number".
- A list response is `{ "items": [...], "next_cursor": <string or null> }`, 20 items per page by default, `req.query.limit` up to 50 (more is `400 BAD_LIMIT`, "limit must be 1-50"). The cursor is the last item's id as a string.
- Dates in responses are `YYYY-MM-DD` strings.

## Handlers

1. `listBooks` - GET /books: all books, sorted by id, paged as above.
2. `getBook` - GET /books/:id: the book, or `404 BOOK_NOT_FOUND`, "no book with that id".
3. `createBook` - POST /books: `req.body` needs `title` (non-empty) and `author` (non-empty), else `422 INVALID_BOOK`, "title and author are required". Returns `201` and the book with its new id.
4. `listMembers` - GET /members: all members, sorted by id, paged as above.
5. `getMember` - GET /members/:id: the member, or `404 MEMBER_NOT_FOUND`, "no member with that id".
6. `checkout` - POST /loans: `req.body` has `book_id` and `member_id`. A book already on loan is `409 BOOK_ON_LOAN`, "book is already on loan". A member with 3 open loans is `409 LOAN_LIMIT`, "member has 3 open loans". Otherwise `201` and the loan: `{ id, book_id, member_id, due_date }`, due 14 days after `req.now` (a `YYYY-MM-DD` string the caller passes).
7. `returnBook` - POST /loans/:id/return: `404 LOAN_NOT_FOUND`, "no loan with that id"; a loan already returned is `409 ALREADY_RETURNED`, "loan was already returned". Otherwise `200` and the loan with `returned_on` set to `req.now`.
8. `overdue` - GET /loans/overdue: open loans whose `due_date` is before `req.now`, sorted by `due_date` then id, paged as above.
