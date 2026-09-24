# Rates service

`GET https://rates.internal/v2/latest?base=USD` with the header `x-api-key: <RATES_API_KEY>` returns
`{ "base": "USD", "rates": { "EUR": 0.92, "GBP": 0.79, ... } }` - units of the currency per 1 USD, so
`usd = amount / rates[currency]`.

The key comes from the environment variable `RATES_API_KEY`. Platform issues keys on request (#platform-access);
this repository has none. The service is only reachable from the office network or the VPN.
