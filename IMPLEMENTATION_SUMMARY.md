# WhatsApp Consent Flow - Implementation Summary

## What Was Implemented

This document summarizes the complete WhatsApp consent flow implementation adapted from PostgreSQL/Prisma to LibSQL/Drizzle.

## Files Created/Modified

### 1. Database Schema
**File**: `src/server/db/schema.ts`
- Added `whatsappConsents` table with LibSQL-compatible types
- Indexes on `status` and `toNumber` for efficient queries

### 2. Twilio Service
**File**: `src/server/services/twilio.ts`
- `sendWhatsAppConsent()` - Sends WhatsApp messages via Twilio Content API
- `validateTwilioSignature()` - Validates webhook requests

### 3. tRPC Router
**File**: `src/server/api/routers/whatsapp-consent.ts`

**Procedures:**
- `startConsent` - Start a new consent request
- `getConsentStatus` - Get status of a consent request
- `getConsentByPhone` - Get consents for a specific phone number
- `markExpiredConsents` - Mark timed-out requests as no_answer
- `getAllConsents` - Admin endpoint to view all consents (protected)

**File**: `src/server/api/root.ts`
- Registered `whatsappConsentRouter` as `whatsappConsent`

### 4. Webhook Endpoint
**File**: `src/app/api/webhooks/twilio/whatsapp/route.ts`
- POST handler for Twilio inbound messages
- Validates Twilio signature
- Processes button responses and text messages
- Updates database with user decision
- Supports multilingual responses (EN, PT, ES, FR)

### 5. MCP Server
**File**: `src/server/mcp/index.ts`
- Standalone MCP server for ElevenLabs Agent integration
- Tools: `start_whatsapp_consent`, `get_consent_status`
- Uses stdio transport for communication

### 6. Timeout Job
**File**: `src/server/jobs/check-consent-timeouts.ts`
- Checks for expired pending consents
- Marks them as `no_answer` after TTL expiration
- Can be run manually or via cron/scheduled job

### 7. Environment Configuration
**File**: `src/env.js`
- Added Twilio environment variables:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_WHATSAPP_FROM`
  - `TWILIO_CONTENT_SID`
  - `TWILIO_STATUS_WEBHOOK` (optional)

### 8. Package Scripts
**File**: `package.json`
- `mcp:server` - Run MCP server
- `timeout:check` - Run timeout check job

### 9. Database Migration
**File**: `drizzle/0001_dazzling_jigsaw.sql`
- Creates `whatsapp_consent` table
- Creates indexes

### 10. Documentation
**Files**:
- `WHATSAPP_CONSENT_SETUP.md` - Complete setup guide
- `IMPLEMENTATION_SUMMARY.md` - This file

## Key Adaptations from Original Design

### PostgreSQL → LibSQL/Turso

| Original (PostgreSQL) | Adapted (LibSQL) |
|----------------------|------------------|
| `TIMESTAMPTZ` | `INTEGER` with `mode: "timestamp"` |
| `JSONB` | `TEXT` (parsed as JSON) |
| `TEXT` (unlimited) | `TEXT` with length constraints |
| `now()` | `unixepoch()` |
| `INTERVAL` arithmetic | Manual timestamp + seconds comparison |
| `ON CONFLICT DO NOTHING` | Try/catch with error handling |

### Prisma → Drizzle ORM

| Original (Prisma) | Adapted (Drizzle) |
|------------------|-------------------|
| `pool.query()` | `db.query.*` / `db.insert()` / `db.update()` |
| Raw SQL strings | Drizzle query builder with `sql` template |
| `@prisma/client` | `drizzle-orm` + `@libsql/client` |
| Schema in `schema.prisma` | Schema in `src/server/db/schema.ts` |

### Database Queries

**Original PostgreSQL:**
```sql
update whatsapp_consents
   set status='no_answer', decided_at=now()
 where status='pending'
   and now() > created_at + (ttl_seconds || ' seconds')::interval
```

**Adapted LibSQL:**
```typescript
await db
  .update(whatsappConsents)
  .set({ status: "no_answer", decidedAt: new Date() })
  .where(
    and(
      eq(whatsappConsents.status, "pending"),
      sql`${whatsappConsents.createdAt} + ${whatsappConsents.ttlSeconds} < unixepoch()`
    )
  );
```

## System Architecture

```
┌─────────────────────┐
│  ElevenLabs Agent   │
│   (Optional)        │
└──────────┬──────────┘
           │
           │ MCP Protocol (stdio)
           ▼
┌─────────────────────┐
│   MCP Server        │
│  (index.ts)         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│           tRPC Router               │
│  (whatsapp-consent.ts)              │
│                                     │
│  - startConsent                     │
│  - getConsentStatus                 │
│  - getConsentByPhone                │
│  - markExpiredConsents              │
│  - getAllConsents                   │
└────────┬─────────────────────┬──────┘
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌──────────────┐
│  Twilio Service │   │   Database   │
│  (twilio.ts)    │   │   (Turso)    │
└────────┬────────┘   └──────┬───────┘
         │                   ▲
         │                   │
         ▼                   │
    ┌────────┐               │
    │ Twilio │               │
    │   API  │               │
    └────┬───┘               │
         │                   │
         ▼                   │
    ┌─────────┐              │
    │WhatsApp │              │
    │  User   │              │
    └────┬────┘              │
         │                   │
         │ Reply             │
         ▼                   │
┌──────────────────┐         │
│  Webhook Route   │─────────┘
│  (route.ts)      │
└──────────────────┘
         ▲
         │ Periodic
┌──────────────────┐
│  Timeout Job     │
│ (check-consent-  │
│  timeouts.ts)    │
└──────────────────┘
```

## Data Flow

### 1. Starting a Consent Request

```
1. Client/Agent calls startConsent({ to, apt, visitor, company, ttl })
2. tRPC router calls sendWhatsAppConsent()
3. Twilio service sends WhatsApp message with template
4. Database record created with status="pending"
5. Returns conversationSid to client
```

### 2. User Response

```
1. User receives WhatsApp message
2. User clicks "Approve" or "Deny" button (or sends text)
3. Twilio sends POST to /api/webhooks/twilio/whatsapp
4. Webhook validates signature
5. Webhook parses response (button or text)
6. Database updated: status="approved" or "denied"
7. Confirmation message sent back to user
```

### 3. Checking Status

```
1. Client/Agent calls getConsentStatus({ conversationSid })
2. tRPC router queries database
3. Returns { status, transcript, decidedAt, ... }
```

### 4. Timeout Handling

```
1. Cron job runs timeout:check periodically
2. Script queries for pending requests where:
   current_time > created_at + ttl_seconds
3. Updates matching records to status="no_answer"
4. Returns count of marked requests
```

## Status Values

| Status | Description |
|--------|-------------|
| `pending` | Waiting for user response |
| `approved` | User approved entry |
| `denied` | User denied entry |
| `no_answer` | Request expired without response |
| `failed` | Invalid/unrecognized response |

## Testing Checklist

- [ ] Environment variables configured
- [ ] Twilio WhatsApp template created and approved
- [ ] Webhook URL configured in Twilio
- [ ] Database migration applied
- [ ] Test consent request sent successfully
- [ ] WhatsApp message received on phone
- [ ] Response processed by webhook
- [ ] Database updated with decision
- [ ] Timeout job marks expired requests
- [ ] MCP server communicates with agent (if using)

## Dependencies Added

```json
{
  "dependencies": {
    "twilio": "^5.10.4",
    "@modelcontextprotocol/sdk": "^1.21.1"
  },
  "devDependencies": {
    "tsx": "^4.20.6"
  }
}
```

## Environment Variables Required

```env
# Existing (already configured)
DATABASE_URL=libsql://...
DATABASE_AUTH_TOKEN=...

# New (need to add)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_CONTENT_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_STATUS_WEBHOOK=https://your-domain.com/api/webhooks/twilio/whatsapp
```

## Next Steps

1. **Add `.env` variables** - Get Twilio credentials
2. **Create Twilio template** - Get Content SID
3. **Deploy application** - Get webhook URL
4. **Configure Twilio webhook** - Point to your URL
5. **Test the flow** - Send a test consent request
6. **Set up timeout job** - Configure cron/scheduled task
7. **Integrate with ElevenLabs** - Configure MCP server (optional)

## Differences Summary

### What's Different from Original

1. **Database**: LibSQL instead of PostgreSQL
2. **ORM**: Drizzle instead of Prisma
3. **Timestamps**: Unix epoch integers instead of timestamptz
4. **JSON Storage**: TEXT fields instead of JSONB
5. **Framework**: Next.js App Router instead of standalone Express
6. **Query Syntax**: Drizzle query builder instead of raw SQL
7. **Error Handling**: Try/catch instead of ON CONFLICT

### What's the Same

1. **Twilio Integration**: Same API calls and webhooks
2. **MCP Protocol**: Same tool definitions and flow
3. **Business Logic**: Same consent flow and status transitions
4. **Webhook Validation**: Same signature verification
5. **Timeout Logic**: Same TTL-based expiration

## Performance Considerations

- **Indexes**: Added on `status` and `toNumber` for fast queries
- **Webhook**: Async processing, returns 200 quickly
- **Timeout Job**: Batches updates, runs periodically
- **Database**: LibSQL is serverless, scales automatically
- **tRPC**: Type-safe, efficient serialization with SuperJSON

## Security Features

✅ Twilio signature validation on webhooks
✅ Environment variable validation via zod
✅ Type-safe database queries
✅ Protected admin endpoints (requires auth)
✅ HTTPS enforced in production

---

**Implementation Date**: 2025-11-07
**Stack**: Next.js 15, tRPC 11, Drizzle ORM, LibSQL/Turso, Twilio
**Status**: ✅ Complete and Ready for Testing
