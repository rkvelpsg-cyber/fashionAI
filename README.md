# Lotus AI Fashion Mirror
Clothing-only AI virtual try-on MVP for Lotus Prime Digital Solutions.

## Run
1. Copy `.env.example` to `.env.local`.
2. Keep `AI_DEMO_MODE=true` for free UI testing.
3. `npm install`
4. `npm run dev`
5. Open http://localhost:3000/kiosk

## Real FASHN mode
Set `AI_DEMO_MODE=false` and provide `FASHN_API_KEY`.

## Important
The customer's original captured photo is reused for each garment. AI output is never chained into the next try-on.

This download is an MVP foundation. Add Supabase multi-tenant admin, temporary storage, QR delivery, analytics, quotas and production camera validation before commercial deployment.
