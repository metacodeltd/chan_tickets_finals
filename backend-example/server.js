// Example Express.js backend for PayHero integration
// Run this with: node server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// PayHero Configuration
const PAYHERO_CONFIG = {
  BASE_URL: 'https://backend.payhero.co.ke/api/v2',
  ACCOUNT_ID: process.env.PAYHERO_ACCOUNT_ID || '2060',
  CHANNEL_ID: process.env.PAYHERO_CHANNEL_ID || '9820939',
  AUTH_TOKEN: process.env.PAYHERO_AUTH_TOKEN ||'aTRCRDhKZmFZY0xZVUdHbjdEdlM6Z2pyaGlCbUxUMmIwSm8wOHk5WFlzbzhpYjNORnZEaDRLUmtjaFhDNA==',
  CALLBACK_URL: process.env.PAYHERO_CALLBACK_URL || 'https://your-domain.com/api/payment-callback'
};

// Middleware
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:8081',
    'https://chan-tickets-ecru.vercel.app' // ✅ allow deployed frontend
  ],
  credentials: true
}));

app.use(express.json());

// In-memory storage for demo (use a proper database in production)
const transactions = new Map();

/**
 * Initiate PayHero STK Push
 */
app.post('/api/payments/initiate', async (req, res) => {
  try {
    const {
      account_id,
      channel_id,
      amount,
      currency,
      reference,
      customer_name,
      phone_number,
      provider,
      callback_url
    } = req.body;

    // Validate required fields
    if (!amount || !customer_name || !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: amount, customer_name, phone_number'
      });
    }

    // Prepare PayHero request
    const payHeroRequest = {
      account_id: account_id || PAYHERO_CONFIG.ACCOUNT_ID,
      channel_id: channel_id || PAYHERO_CONFIG.CHANNEL_ID,
      amount: parseInt(amount),
      currency: currency || 'KES',
      reference: reference || `CHAN${Date.now().toString().slice(-8)}`,
      customer_name,
      phone_number,
      provider: provider || 'm-pesa',
      callback_url: callback_url || PAYHERO_CONFIG.CALLBACK_URL
    };

    console.log('Initiating PayHero payment:', {
      ...payHeroRequest,
      phone_number: phone_number.slice(0, 6) + '****' + phone_number.slice(-2)
    });

    // Make request to PayHero API
    const response = await fetch(`${PAYHERO_CONFIG.BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${PAYHERO_CONFIG.AUTH_TOKEN}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payHeroRequest)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`PayHero API Error: ${response.status} - ${data.message || 'Unknown error'}`);
    }

    // Store transaction for status checking
    const transactionId = data.transaction?.id || data.data?.id;
    if (transactionId) {
      transactions.set(transactionId, {
        ...payHeroRequest,
        status: 'pending',
        created_at: new Date().toISOString(),
        payhero_response: data
      });
    }

    res.json({
      success: true,
      message: data.message || 'Payment initiated successfully',
      transaction: data.transaction || data.data
    });

  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate payment',
      error: {
        code: 'PAYMENT_INITIATION_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * Check PayHero payment status
 */
app.get('/api/payments/status/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    // Check local storage first
    const localTransaction = transactions.get(transactionId);

    // Make request to PayHero API
    const response = await fetch(`${PAYHERO_CONFIG.BASE_URL}/payments/${transactionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${PAYHERO_CONFIG.AUTH_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`PayHero API Error: ${response.status} - ${data.message || 'Unknown error'}`);
    }

    // Update local storage
    if (localTransaction) {
      transactions.set(transactionId, {
        ...localTransaction,
        status: data.transaction?.status || data.data?.status || 'pending',
        updated_at: new Date().toISOString(),
        payhero_status_response: data
      });
    }

    res.json({
      success: true,
      transaction: data.transaction || data.data
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_CHECK_FAILED',
        message: error.message || 'Failed to check payment status'
      }
    });
  }
});

/**
 * PayHero Webhook Handler
 */
app.post('/api/payment-callback', (req, res) => {
  try {
    const payload = req.body;
    
    console.log('Received PayHero webhook:', payload);

    // Verify webhook signature if available
    // const signature = req.headers['x-payhero-signature'];
    // if (!verifyWebhookSignature(payload, signature)) {
    //   return res.status(401).send('Invalid signature');
    // }

    // Process the webhook
    if (payload.data && payload.data.transaction) {
      const transaction = payload.data.transaction;
      
      // Update local storage
      if (transactions.has(transaction.id)) {
        const localTransaction = transactions.get(transaction.id);
        transactions.set(transaction.id, {
          ...localTransaction,
          status: transaction.status,
          updated_at: new Date().toISOString(),
          webhook_payload: payload
        });
      }

      // Here you would typically:
      // - Update your database
      // - Send email notifications
      // - Generate tickets
      // - Trigger any business logic
      
      console.log(`Payment ${transaction.status}: ${transaction.id}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    payhero_config: {
      account_id: PAYHERO_CONFIG.ACCOUNT_ID,
      channel_id: PAYHERO_CONFIG.CHANNEL_ID,
      has_auth_token: !!PAYHERO_CONFIG.AUTH_TOKEN,
      callback_url: PAYHERO_CONFIG.CALLBACK_URL
    }
  });
});

/**
 * Get all transactions (for debugging)
 */
app.get('/api/transactions', (req, res) => {
  const allTransactions = Array.from(transactions.entries()).map(([id, data]) => ({
    id,
    ...data
  }));
  
  res.json({
    success: true,
    transactions: allTransactions
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PayHero backend server running on http://localhost:${PORT}`);
  console.log('📱 PayHero Configuration:');
  console.log(`   Account ID: ${PAYHERO_CONFIG.ACCOUNT_ID}`);
  console.log(`   Channel ID: ${PAYHERO_CONFIG.CHANNEL_ID}`);
  console.log(`   Has Auth Token: ${!!PAYHERO_CONFIG.AUTH_TOKEN}`);
  console.log(`   Callback URL: ${PAYHERO_CONFIG.CALLBACK_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});
