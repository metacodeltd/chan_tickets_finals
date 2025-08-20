# PayHero STK Push Integration Guide

This guide explains how to set up and use the PayHero STK Push integration in your Chan Tickets application.

## Overview

The implementation includes:
- ✅ PayHero STK Push integration
- ✅ Real-time payment status tracking
- ✅ Comprehensive error handling
- ✅ Phone number validation
- ✅ Automatic e-ticket generation
- ✅ Backend API proxy (optional)

## Quick Start

### 1. Environment Configuration

Create a `.env` file in your project root:

```env
# PayHero Configuration
VITE_PAYHERO_ACCOUNT_ID=2060
VITE_PAYHERO_CHANNEL_ID=9820939
VITE_PAYHERO_AUTH_TOKEN=your_payhero_auth_token_here
VITE_PAYHERO_CALLBACK_URL=https://your-domain.com/api/payment-callback
VITE_PAYHERO_BASE_URL=https://backend.payhero.co.ke/api/v2

# For backend integration (optional)
VITE_API_BASE_URL=http://localhost:5000/api
```

### 2. Frontend Setup

The PaymentModal component is already configured to work with PayHero. The main files are:

- `src/components/PaymentModal.tsx` - Main payment modal with STK push
- `src/lib/payhero-service.ts` - PayHero API service
- `src/lib/payhero-config.ts` - Configuration constants

### 3. Backend Setup (Recommended)

For production use, set up the backend to handle CORS and secure API calls:

```bash
cd backend-example
npm install
cp .env.example .env
# Edit .env with your PayHero credentials
npm start
```

## Features

### STK Push Flow

1. **User Input**: Customer enters phone number, name, and email
2. **Validation**: Phone number is validated for Kenyan format
3. **Initiation**: STK push is sent to customer's phone
4. **Polling**: Status is checked every 3 seconds
5. **Confirmation**: Success triggers e-ticket generation

### Payment Status Tracking

```typescript
// Payment states
'idle'       // Initial state
'initiating' // Sending STK push request
'pending'    // Waiting for customer to enter PIN
'success'    // Payment completed successfully
'failed'     // Payment failed or was cancelled
```

### Error Handling

The implementation includes comprehensive error handling for:
- Invalid phone numbers
- Network errors
- PayHero API errors
- Timeout scenarios
- Missing required fields

## Usage

### Basic Usage

The PaymentModal is already integrated. To use it:

```tsx
import PaymentModal from '@/components/PaymentModal';

<PaymentModal
  isOpen={showPaymentModal}
  onClose={() => setShowPaymentModal(false)}
  amount="KES 500"
  ticketDetails={{
    type: "VIP",
    quantity: 1,
    matchId: "kenya-vs-madagascar"
  }}
/>
```

### Custom Configuration

To customize PayHero settings:

```typescript
// src/lib/payhero-config.ts
export const PAYHERO_CONFIG = {
  ACCOUNT_ID: 'your_account_id',
  CHANNEL_ID: 'your_channel_id',
  AUTH_TOKEN: 'your_auth_token',
  // ... other settings
};
```

## API Endpoints

### Backend Endpoints (if using backend)

```
POST /api/payments/initiate
GET  /api/payments/status/:transactionId
POST /api/payment-callback (webhook)
GET  /api/health (health check)
```

### Request/Response Examples

#### Initiate Payment
```json
// POST /api/payments/initiate
{
  "account_id": "2060",
  "channel_id": "9820939",
  "amount": 500,
  "currency": "KES",
  "reference": "CHAN12345",
  "customer_name": "John Doe",
  "phone_number": "254712345678",
  "provider": "m-pesa",
  "callback_url": "https://your-domain.com/api/payment-callback"
}
```

```json
// Response
{
  "success": true,
  "message": "Payment initiated successfully",
  "transaction": {
    "id": "txn_123456",
    "reference": "CHAN12345",
    "status": "pending",
    "amount": 500,
    "currency": "KES",
    "provider": "m-pesa",
    "customer_name": "John Doe",
    "phone_number": "254712345678"
  }
}
```

#### Check Status
```json
// GET /api/payments/status/txn_123456
{
  "success": true,
  "transaction": {
    "id": "txn_123456",
    "reference": "CHAN12345",
    "status": "completed",
    "amount": 500,
    "currency": "KES",
    "provider": "m-pesa",
    "customer_name": "John Doe",
    "phone_number": "254712345678",
    "created_at": "2025-01-19T20:39:15Z",
    "updated_at": "2025-01-19T20:40:15Z"
  }
}
```

## Development

### Testing the Integration

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Start the backend (optional):**
   ```bash
   cd backend-example
   npm run dev
   ```

3. **Test the payment flow:**
   - Go to ticket selection
   - Add tickets to cart
   - Open payment modal
   - Enter valid Kenyan phone number
   - Complete the M-PESA transaction on your phone

### Debugging

Enable debug logs by checking the browser console. The implementation logs:
- Payment initiation requests
- Status check responses
- Error details
- Transaction state changes

### Phone Number Testing

Test with various formats:
- `0712345678` (local format)
- `254712345678` (international format)
- `712345678` (without prefix)

## Production Deployment

### Security Considerations

1. **Environment Variables**: Never commit API tokens to version control
2. **HTTPS**: Use HTTPS for all webhook endpoints
3. **Webhook Verification**: Implement signature verification for webhooks
4. **Rate Limiting**: Add rate limiting to prevent API abuse
5. **Input Validation**: Validate all user inputs server-side

### Webhook Setup

Configure your PayHero account to send webhooks to:
```
https://your-domain.com/api/payment-callback
```

The webhook handler is implemented in `backend-example/server.js`.

### CORS Configuration

For production, update CORS settings in your backend:

```javascript
app.use(cors({
  origin: ['https://your-frontend-domain.com'],
  credentials: true
}));
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Use the backend proxy or configure PayHero for CORS
2. **Invalid Phone Number**: Ensure format is valid Kenyan mobile number
3. **Authentication Failed**: Check your PayHero API token
4. **Webhook Not Received**: Verify callback URL is accessible
5. **STK Push Not Received**: Check phone number and network connectivity

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Authentication failed" | Invalid API token | Update PAYHERO_AUTH_TOKEN |
| "Invalid phone number prefix" | Wrong network | Use Safaricom (254-7), Airtel (254-1), or Telkom (254-70) |
| "Payment timeout" | User didn't complete | Ask user to retry |
| "CORS error" | Direct API call blocked | Use backend proxy |

### Support

For PayHero API issues, contact:
- Email: support@payhero.co.ke
- Documentation: https://docs.payhero.co.ke

## File Structure

```
src/
├── components/
│   ├── PaymentModal.tsx         # Main payment modal
│   └── ETicket.tsx             # E-ticket component
├── lib/
│   ├── payhero-config.ts       # Configuration constants
│   ├── payhero-service.ts      # PayHero API service
│   └── payhero-webhook.ts      # Webhook handler types
└── ...

backend-example/
├── server.js                   # Express.js backend
├── package.json               # Backend dependencies
└── .env.example              # Environment template
```

## Next Steps

1. **Add Database**: Store transactions in a database
2. **Email Notifications**: Send payment confirmations via email
3. **SMS Notifications**: Send ticket details via SMS
4. **Analytics**: Track payment success rates
5. **Multiple Payment Methods**: Add card payments, bank transfers
6. **Refunds**: Implement refund functionality
7. **Receipts**: Generate PDF receipts

## License

This implementation is part of the Chan Tickets project and follows the same license terms.
