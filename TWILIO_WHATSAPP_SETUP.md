# Twilio WhatsApp Setup - Quick Fix Guide

## Error: "Twilio could not find a Channel with the specified From address"

This error means your WhatsApp sender number is not properly configured in Twilio. Follow these steps to fix it:

## Option 1: Using Twilio Sandbox (Recommended for Testing)

The Twilio Sandbox is a free testing environment for WhatsApp. Perfect for development and testing.

### Step 1: Find Your Sandbox Details

1. Login to [Twilio Console](https://console.twilio.com)
2. Navigate to: **Messaging** → **Try it out** → **Send a WhatsApp message**
3. You'll see a screen like this:

   ```
   To connect your sandbox:
   Join your WhatsApp Sandbox by sending this code from your WhatsApp:

   join happy-dog

   to this number:
   +1 415 523 8886
   ```

### Step 2: Join the Sandbox

1. Open WhatsApp on your phone
2. Start a new chat with: **+1 415 523 8886**
3. Send the message: **join [your-code]** (e.g., `join happy-dog`)
4. You should receive a confirmation message

### Step 3: Update Your Environment Variables

In your `.env` file, set:

```env
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

**Important:** This is the Twilio Sandbox number, NOT your personal phone number!

### Step 4: Test the Connection

1. Go to your app's index page
2. In the debug panel, enter your phone number (the one you used to join the sandbox)
3. Click "Send WhatsApp Consent"
4. You should receive a WhatsApp message!

## Option 2: Using a Production WhatsApp Business Number

If you have an approved WhatsApp Business number from Twilio:

### Step 1: Find Your WhatsApp Sender Number

1. Login to [Twilio Console](https://console.twilio.com)
2. Navigate to: **Messaging** → **Senders** → **WhatsApp Senders**
3. You'll see your approved WhatsApp sender(s)
4. Copy the phone number (e.g., `+1234567890`)

### Step 2: Update Environment Variables

In your `.env` file, set:

```env
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890
```

Replace `+1234567890` with your actual approved number.

### Step 3: Verify Template Approval

1. Go to: **Messaging** → **Content Editor**
2. Find your `visitor_consent` template
3. Ensure status is **Approved** (not Pending or Rejected)
4. Copy the Content SID (starts with `HX...`)
5. Update your `.env`:

```env
TWILIO_CONTENT_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Common Issues

### "I joined the sandbox but still getting the error"

**Solution:** Make sure you're using `whatsapp:+14155238886` (Twilio's sandbox number), NOT your own phone number as the FROM address.

### "The number I'm sending to doesn't receive messages"

**Solution:**
- For **Sandbox**: The recipient must also join the sandbox first
- For **Production**: No need to join, but ensure the number is in E.164 format (+country code + number)

### "How do I know if I'm using Sandbox or Production?"

Check your `TWILIO_WHATSAPP_FROM` value:
- `whatsapp:+14155238886` = Twilio Sandbox
- Any other number = Your production WhatsApp Business number

## Sandbox Limitations

- **Recipients must join:** Everyone receiving messages must join your sandbox first
- **24-hour session:** Each user's sandbox session expires after 24 hours of inactivity
- **Testing only:** Not suitable for production use

## Moving to Production

To use a production WhatsApp number:

1. Apply for WhatsApp Business API access in Twilio Console
2. Complete Meta's business verification
3. Create and get your message templates approved
4. Get your WhatsApp Business number assigned
5. Update environment variables with production credentials

## Quick Verification Checklist

Use the debug panel on your index page to verify:

- [ ] `TWILIO_ACCOUNT_SID` is set
- [ ] `TWILIO_AUTH_TOKEN` is set
- [ ] `TWILIO_WHATSAPP_FROM` is set to correct sender number
- [ ] `TWILIO_CONTENT_SID` is set to approved template SID
- [ ] You (or recipient) have joined the sandbox (if using sandbox)
- [ ] Webhook URL is configured in Twilio Console

## Testing Your Setup

1. Visit your app at `/`
2. Check the System Status section for any red indicators
3. Enter your phone number (that joined the sandbox)
4. Fill in test data for apartment, visitor, company
5. Click "Send WhatsApp Consent"
6. Check for success message or error
7. Check your WhatsApp for the incoming message

## Still Having Issues?

1. **Check Twilio Logs:**
   - Go to: **Monitor** → **Logs** → **Messaging**
   - Look for recent errors with details

2. **Verify Credentials:**
   - Visit `/api/diagnostics` to see configuration status
   - All Twilio fields should show green

3. **Check Console Logs:**
   - Open browser DevTools → Console
   - Look for any JavaScript errors

4. **Check Server Logs:**
   - If deployed on Vercel: Check deployment logs
   - If running locally: Check terminal output

## Support Resources

- [Twilio WhatsApp Sandbox Docs](https://www.twilio.com/docs/whatsapp/sandbox)
- [Twilio WhatsApp API Docs](https://www.twilio.com/docs/whatsapp/api)
- [Twilio Console](https://console.twilio.com)
- Check `WHATSAPP_CONSENT_SETUP.md` for complete system documentation

---

**Last Updated:** 2025-11-07
