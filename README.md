# Lotus AI Saree Mirror

Saree-only AI virtual try-on MVP for Lotus Prime Digital Solutions.

## Run

1. Copy `.env.example` to `.env.local`.
2. Keep `AI_DEMO_MODE=true` for free UI testing.
3. `npm install`
4. `npm run dev`
5. Open http://localhost:3000/kiosk

## Real FASHN mode

Set `AI_DEMO_MODE=false` and provide `FASHN_API_KEY`.

## FASHN cost protection

Paid FASHN generation is disabled by default. A real provider request is allowed only when both `AI_DEMO_MODE=false` and `AI_ALLOW_PAID_GENERATION=true`. When either condition is false, the try-on route returns a local development preview and never calls FASHN. Set `AI_MAX_GENERATIONS_PER_SESSION=5` to cap attempted paid generations for each kiosk browser session.

The kiosk prevents duplicate in-flight requests, and the server counts attempts before entering the existing saree provider router. Browsing the saree catalogue does not call the provider; generation begins only after an explicit try-on action.

## Important

The customer's original captured photo is reused for every saree trial. AI output is never chained into the next try-on.

Local product images are read server-side and sent to FASHN as data URLs containing the original file bytes. They are not resized, filtered, recoloured, or re-encoded by the image conversion helper.

This download is an MVP foundation. Add Supabase multi-tenant admin, temporary storage, QR delivery, analytics, quotas and production camera validation before commercial deployment.
