# Webhook Notifications

PrepTrac supports webhook notifications to send real-time alerts to external services when inventory events occur.

## Setup

1. **Enable Webhooks**: Go to Settings → Notifications
2. **Configure Webhook URL**: Enter your webhook endpoint URL
3. **Optional Secret**: Add a secret for HMAC-SHA256 signature verification
4. **Configure Preferences**: Set notification thresholds (days before expiration, etc.)
5. **Test**: Click "Send Test Webhook" to verify your endpoint

## Webhook Payload

All webhooks are sent as HTTP POST requests with JSON payloads:

```json
{
  "type": "expiration" | "maintenance" | "rotation" | "battery_replacement" | "low_inventory",
  "message": "Emergency Water expires on 12/15/2024",
  "date": "2024-12-15T00:00:00.000Z",
  "itemId": "clx123...",
  "eventId": "clx456...",
  "item": {
    "id": "clx123...",
    "name": "Emergency Water",
    "quantity": 10,
    "unit": "gallons",
    "category": "Water",
    "location": "Basement Shelf A",
    "expirationDate": "2024-12-15T00:00:00.000Z"
  },
  "timestamp": "2024-11-30T19:30:00.000Z"
}
```

## Webhook Types

### Expiration
Sent when items are approaching their expiration date.

**Trigger**: Item expiration date is within the configured number of days.

### Maintenance
Sent when items need scheduled maintenance.

**Trigger**: Item's next maintenance date is within the configured number of days.

### Rotation
Sent when items need to be rotated.

**Trigger**: Item's next rotation date is within the configured number of days.

### Battery Replacement
Sent for battery replacement events.

**Trigger**: Manual event creation or scheduled battery replacement.

### Low Inventory
Sent when an item has a low-inventory threshold set and its quantity is at or below that threshold.

**Trigger**: Item has Low Inventory Threshold &gt; 0 and quantity ≤ threshold. Items with threshold 0 or empty do not trigger this webhook.

## Security: Signature Verification

If you provide a webhook secret, all webhooks are signed with HMAC-SHA256.

### Header
```
X-PrepTrac-Signature: sha256=<signature>
```

### Verification Example (Node.js)

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  const providedSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(providedSignature)
  );
}

// Usage
app.post('/webhook', express.json(), (req, res) => {
  const signature = req.headers['x-preptrac-signature'];
  const secret = process.env.WEBHOOK_SECRET;
  
  if (!verifyWebhook(req.body, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  console.log('Webhook received:', req.body);
  res.status(200).send('OK');
});
```

### Verification Example (Python)

```python
import hmac
import hashlib
import json

def verify_webhook(payload, signature, secret):
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        json.dumps(payload).encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    provided_signature = signature.replace('sha256=', '')
    
    return hmac.compare_digest(expected_signature, provided_signature)

# Usage
@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-PrepTrac-Signature')
    secret = os.environ.get('WEBHOOK_SECRET')
    
    if not verify_webhook(request.json, signature, secret):
        return 'Invalid signature', 401
    
    # Process webhook
    print('Webhook received:', request.json)
    return 'OK', 200
```

## Webhook Endpoint Requirements

Your webhook endpoint should:

1. **Accept POST requests** with JSON content
2. **Return 2xx status** (200, 201, 202) for success
3. **Respond quickly** (within 10 seconds, timeout is 10s)
4. **Handle errors gracefully** - PrepTrac will log failures but won't retry automatically
5. **Verify signatures** if using a secret

## Example Webhook Handler

### Node.js/Express

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook', (req, res) => {
  const { type, message, item, date } = req.body;
  
  console.log(`Received ${type} notification: ${message}`);
  
  if (item) {
    console.log(`Item: ${item.name} (${item.quantity} ${item.unit})`);
    console.log(`Location: ${item.location}`);
  }
  
  // Process the notification
  // - Send to Slack
  // - Create ticket
  // - Update external system
  // - Send SMS
  
  res.status(200).json({ received: true });
});

app.listen(3001, () => {
  console.log('Webhook server listening on port 3001');
});
```

### Python/Flask

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json
    webhook_type = data.get('type')
    message = data.get('message')
    item = data.get('item')
    
    print(f"Received {webhook_type} notification: {message}")
    
    if item:
        print(f"Item: {item['name']} ({item['quantity']} {item['unit']})")
        print(f"Location: {item['location']}")
    
    # Process the notification
    
    return jsonify({'received': True}), 200

if __name__ == '__main__':
    app.run(port=3001)
```

## Integration Examples

### Slack Integration

```javascript
const axios = require('axios');

app.post('/webhook', express.json(), async (req, res) => {
  const { type, message, item } = req.body;
  
  const slackMessage = {
    text: `🔔 PrepTrac Alert: ${message}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${message}*`
        }
      }
    ]
  };
  
  if (item) {
    slackMessage.blocks.push({
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Item:* ${item.name}` },
        { type: 'mrkdwn', text: `*Quantity:* ${item.quantity} ${item.unit}` },
        { type: 'mrkdwn', text: `*Location:* ${item.location}` },
        { type: 'mrkdwn', text: `*Category:* ${item.category}` }
      ]
    });
  }
  
  await axios.post(process.env.SLACK_WEBHOOK_URL, slackMessage);
  res.status(200).send('OK');
});
```

### Discord Integration

```javascript
app.post('/webhook', express.json(), async (req, res) => {
  const { type, message, item } = req.body;
  
  const embed = {
    title: 'PrepTrac Notification',
    description: message,
    color: type === 'expiration' ? 0xff0000 : 0x00ff00,
    fields: []
  };
  
  if (item) {
    embed.fields.push(
      { name: 'Item', value: item.name, inline: true },
      { name: 'Quantity', value: `${item.quantity} ${item.unit}`, inline: true },
      { name: 'Location', value: item.location, inline: true }
    );
  }
  
  await axios.post(process.env.DISCORD_WEBHOOK_URL, {
    embeds: [embed]
  });
  
  res.status(200).send('OK');
});
```

## Testing

Use the "Send Test Webhook" button in Settings to verify your endpoint is working. The test webhook will send a sample payload to your configured URL.

## Troubleshooting

### Webhook not received
- Check your webhook URL is correct and accessible
- Verify your endpoint accepts POST requests
- Check server logs for errors
- Ensure firewall/security groups allow incoming connections

### Invalid signature
- Verify the secret matches in both PrepTrac and your endpoint
- Ensure you're using the raw request body for signature verification
- Check that signature header is being read correctly

### Timeout errors
- Ensure your endpoint responds within 10 seconds
- Optimize your webhook handler performance
- Consider using async processing for heavy operations

## Best Practices

1. **Idempotency**: Make your webhook handler idempotent to handle duplicate deliveries
2. **Logging**: Log all webhook receipts for debugging
3. **Error Handling**: Return appropriate status codes and handle errors gracefully
4. **Rate Limiting**: Implement rate limiting if needed
5. **Validation**: Validate webhook payloads before processing
6. **Security**: Always verify signatures when using secrets

## API Reference

### Send Test Webhook

**Endpoint**: `api.notifications.sendTestWebhook`

**Method**: Mutation

**Response**:
```typescript
{
  success: boolean;
  message: string;
}
```

---

For more information, see the main [README.md](./README.md).

