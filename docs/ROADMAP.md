# ResDrop — Rate data & monetization sources

## Live now
- **Expedia (via Awin)** — affiliate commission on rebooking.

## In progress
- **LiteAPI (Nuitée)** — primary rate DATA + rebooking with commission.
  - Client: `server/liteApi.js` · Catalog sync: `server/scripts/sync-hotels.js`
  - Table: `server/migrations/hotels-catalog.sql` (`hotels_catalog`)
  - Key: set `LITEAPI_KEY` in `server/.env` and Railway → Variables.

## Next
- **Travelpayouts** — one integration → many reliable brands (Trip.com,
  Agoda, Booking.com), replacing the Booking/Awin gap.

## Roadmap
- **Amadeus Self-Service (Hotel Search API)** — second, independent rate
  DATA source to cross-check LiteAPI and raise alert confidence before we
  notify a user. Official, free test tier. Add as `server/amadeusApi.js`
  mirroring the LiteAPI client shape.
- **RateHawk / Hotelbeds (HBX)** — B2B bedbanks for wider inventory (needs
  a commercial relationship; evaluate once volume justifies it).

## Hotel list strategy
Do not hardcode hotels. `hotels_catalog` is populated from LiteAPI's
`/data/hotels` (real ids like `lp3803c`) per country and refreshed on a
weekly cron. Monitoring queries rates by these ids; direct/hotel-site rates
already surface inside LiteAPI's aggregated `hotels/rates` response.
