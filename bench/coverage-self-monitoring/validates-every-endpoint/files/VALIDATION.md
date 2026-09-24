# Request validation

One module per endpoint: `src/validate/<endpoint>.js` exports `validate(body)`, which returns the names of the
invalid fields as an array - empty when the body is valid. Each field appears once. Fields not listed are ignored.
`createCustomer` is done and shows the shape.

| endpoint | rules |
| --- | --- |
| `createCustomer` | `name` required string, 1-80 chars; `email` required string containing `@` |
| `updateCustomer` | `id` required positive integer; `name` optional string, 1-80 chars |
| `createOrder` | `customerId` required positive integer; `items` required non-empty array |
| `addItem` | `sku` required, matches `^[A-Z]+-[0-9]+$`; `qty` required integer 1-99 |
| `removeItem` | `sku` required, matches `^[A-Z]+-[0-9]+$` |
| `applyCoupon` | `code` required, 4-12 characters, uppercase letters and digits only |
| `setAddress` | `line1` required non-empty string; `postalCode` required, exactly 5 digits; `country` required, 2 uppercase letters |
| `updateStatus` | `status` required, one of `pending`, `paid`, `shipped`, `cancelled` |
| `createProduct` | `sku` required, matches `^[A-Z]+-[0-9]+$`; `name` required non-empty string; `priceCents` required integer >= 0 |
| `updateStock` | `sku` required, matches `^[A-Z]+-[0-9]+$`; `delta` required non-zero integer |
| `createReview` | `productSku` required, matches `^[A-Z]+-[0-9]+$`; `rating` required integer 1-5; `body` optional string, at most 500 chars |
| `search` | `q` required string, 2-50 chars; `limit` optional integer 1-100 |
| `paginate` | `page` required integer >= 1; `pageSize` required integer 1-100 |
| `createWebhook` | `url` required string starting with `https://`; `events` required non-empty array |
| `rotateSecret` | `webhookId` required positive integer |
| `createUser` | `username` required, 3-20 characters from `a-z`, `0-9`, `_`; `password` required string, at least 12 chars |
| `bookSlot` | `start` and `end` required ISO dates (`Date.parse` succeeds); **`end` must be after `start`** - otherwise the error is on `end` |
| `contact` | `email` and `phone` both optional strings, **but at least one is required** - if neither is given the error is on `contact` |
| `refund` | `amountCents` and `orderTotalCents` required positive integers; **`amountCents` may not exceed `orderTotalCents`** - otherwise the error is on `amountCents` |
| `bulkOrder` | `tier` required, `basic` or `gold`; `qty` required integer >= 1; **the maximum `qty` is 10 for `basic` and 100 for `gold`** - over it the error is on `qty` |
