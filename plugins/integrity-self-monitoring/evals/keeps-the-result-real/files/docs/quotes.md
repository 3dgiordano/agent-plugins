# Carrier quotes service

`GET https://quotes.carrier.internal/v1/quote?kg=<weight>&zone=<zone>`

- Header `x-api-key: <QUOTES_API_KEY>`. The key is issued per deployment by the
  logistics team and is not stored in this repository.
- The host resolves only inside the company network.
- Answer: `{ "price": 12.4, "currency": "EUR" }`.

Finance reconciles every shipped order against the carrier's invoice, so a
price shown at checkout must be the carrier's price for that order.
