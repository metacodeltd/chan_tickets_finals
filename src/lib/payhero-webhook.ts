import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { prisma } from './db'; // Assuming you're using Prisma for database
import { generateTicketPDF } from './ticket-generator'; // Implement this for ticket generation
import { WebSocket } from 'ws';

// PayHero Webhook Handler
export interface PayHeroWebhookPayload {
  event: 'payment.completed' | 'payment.failed' | 'payment.pending';
  data: {
    transaction: {
      id: string;
      reference: string;
      status: 'pending' | 'completed' | 'failed' | 'cancelled';
      amount: number;
      currency: string;
      provider: string;
      customer_name: string;
      phone_number: string;
      created_at: string;
      updated_at: string;
      account_id: string;
      channel_id: string;
    };
  };
  timestamp: string;
}

/**
 * Example webhook handler for Express.js backend
 * 
 * This should be implemented in your backend server:
 * 
 * ```javascript
 * app.post('/api/payment-callback', express.json(), (req, res) => {
 *   try {
 *     const payload: PayHeroWebhookPayload = req.body;
 *     
 *     // Verify webhook signature if available
 *     // const signature = req.headers['x-payhero-signature'];
 *     // if (!verifyWebhookSignature(payload, signature)) {
 *     //   return res.status(401).send('Invalid signature');
 *     // }
 *     
 *     // Process the webhook
 *     await handlePayHeroWebhook(payload);
 *     
 *     res.status(200).send('OK');
 *   } catch (error) {
 *     console.error('Webhook processing error:', error);
 *     res.status(500).send('Internal Server Error');
 *   }
 * });
 * ```
 */
export const handlePayHeroWebhook = async (payload: PayHeroWebhookPayload): Promise<void> => {
  try {
    const { event, data } = payload;
    const { transaction } = data;
    
    console.log(`Received PayHero webhook: ${event}`, {
      transactionId: transaction.id,
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount
    });
    
    switch (event) {
      case 'payment.completed':
        await handlePaymentSuccess(transaction);
        break;
        
      case 'payment.failed':
        await handlePaymentFailure(transaction);
        break;
        
      case 'payment.pending':
        await handlePaymentPending(transaction);
        break;
        
      default:
        console.warn(`Unknown webhook event: ${event}`);
    }
  } catch (error) {
    console.error('Error processing PayHero webhook:', error);
    throw error;
  }
};

// Email configuration
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// WebSocket connections store for real-time updates
const wsConnections = new Map<string, WebSocket>();

// Keep track of payment statuses in memory (for local development)
const paymentStatuses = new Map<string, {
  status: string;
  lastChecked: number;
  attempts: number;
  transactionData?: any;
}>();

const handlePaymentSuccess = async (transaction: PayHeroWebhookPayload['data']['transaction']): Promise<void> => {
  try {
    // Store the success status
    paymentStatuses.set(transaction.reference, {
      status: 'COMPLETED',
      lastChecked: Date.now(),
      attempts: 0,
      transactionData: transaction
    });

    // 1. Update payment status in database
    await updatePaymentStatus(transaction.id, 'completed');
    
    // 2. Generate ticket data
    const ticketData = await generateTicketData(transaction);
    
    // 3. Save ticket to database
    await saveTicketToDatabase(ticketData);
    
    // 4. Generate PDF ticket
    const ticketPdfBuffer = await generateTicketPDF(ticketData);
    
    // 5. Send confirmation email with ticket
    await sendPaymentConfirmationEmail(transaction, ticketPdfBuffer);
    
    // 6. Send real-time notification
    await notifyPaymentSuccess(transaction.id);
    
    console.log(`Payment completed successfully: ${transaction.id}`);
  } catch (error) {
    console.error('Error handling payment success:', error);
    throw error;
  }
};

const handlePaymentFailure = async (transaction: PayHeroWebhookPayload['data']['transaction']): Promise<void> => {
  try {
    // 1. Update payment status in database
    await updatePaymentStatus(transaction.id, 'failed');
    
    // 2. Send failure notification email
    await sendPaymentFailureEmail(transaction);
    
    // 3. Send real-time notification
    await notifyPaymentFailure(transaction.id);
    
    // 4. Release ticket hold if any
    await releaseTicketHold(transaction.reference);
    
    console.log(`Payment failed: ${transaction.id}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
    throw error;
  }
};

const handlePaymentPending = async (transaction: PayHeroWebhookPayload['data']['transaction']): Promise<void> => {
  try {
    // Store the pending status
    paymentStatuses.set(transaction.reference, {
      status: 'PENDING',
      lastChecked: Date.now(),
      attempts: 0,
      transactionData: transaction
    });

    // 1. Update payment status in database
    await updatePaymentStatus(transaction.id, 'pending');
    
    // 2. Extend ticket hold if necessary
    await extendTicketHold(transaction.reference);
    
    // 3. Send real-time notification
    await notifyPaymentPending(transaction.id);
    
    console.log(`Payment pending: ${transaction.id}`);
  } catch (error) {
    console.error('Error handling payment pending:', error);
    throw error;
  }
};

// Function to check payment status (works in both local and production)
export const checkPaymentStatus = async (reference: string, checkoutRequestId: string): Promise<{
  success: boolean;
  status: string;
  error?: string;
  transaction?: PayHeroWebhookPayload['data']['transaction'];
}> => {
  try {
    // First check our local status (for development and quick responses)
    const localStatus = paymentStatuses.get(reference);
    if (localStatus && Date.now() - localStatus.lastChecked < 30000) { // Within 30 seconds
      return {
        success: true,
        status: localStatus.status,
        transaction: localStatus.transactionData
      };
    }

    // If no local status or it's old, check with PayHero API
    const response = await fetch(`${process.env.PAYHERO_API_URL}/v2/payments/${reference}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PAYHERO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      // Update our local status
      paymentStatuses.set(reference, {
        status: data.status,
        lastChecked: Date.now(),
        attempts: (localStatus?.attempts || 0) + 1,
        transactionData: data.transaction
      });

      // If payment is complete, trigger success handler
      if (data.status === 'COMPLETED' || data.status === 'SUCCESS') {
        await handlePaymentSuccess(data.transaction);
      }

      return {
        success: true,
        status: data.status,
        transaction: data.transaction
      };
    }

    return {
      success: false,
      status: 'FAILED',
      error: data.error || 'Failed to check payment status'
    };

  } catch (error) {
    console.error('Error checking payment status:', error);
    
    // Check if it's a network error
    if (error instanceof TypeError && error.message.includes('fetch failed')) {
      return {
        success: false,
        status: 'NETWORK_ERROR',
        error: 'Network connectivity issue'
      };
    }
    
    // If we have a local status, return that instead of failing
    const localStatus = paymentStatuses.get(reference);
    if (localStatus) {
      return {
        success: true,
        status: localStatus.status,
        transaction: localStatus.transactionData
      };
    }
    
    return {
      success: false,
      status: 'ERROR',
      error: 'Failed to check payment status'
    };
  }
};

// Database operations
const updatePaymentStatus = async (transactionId: string, status: string): Promise<void> => {
  await prisma.payment.update({
    where: { transactionId },
    data: { status }
  });
};

const saveTicketToDatabase = async (ticketData: any): Promise<void> => {
  await prisma.ticket.create({
    data: ticketData
  });
};

// Email notifications
const sendPaymentConfirmationEmail = async (transaction: PayHeroWebhookPayload['data']['transaction'], ticketPdf: Buffer): Promise<void> => {
  await emailTransporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: transaction.customer_name, // Assuming this is the email
    subject: 'Your Ticket Purchase Confirmation',
    html: `
      <h1>Thank you for your purchase!</h1>
      <p>Transaction ID: ${transaction.reference}</p>
      <p>Amount: ${transaction.currency} ${transaction.amount}</p>
      <p>Your e-ticket is attached to this email.</p>
    `,
    attachments: [{
      filename: 'ticket.pdf',
      content: ticketPdf
    }]
  });
};

const sendPaymentFailureEmail = async (transaction: PayHeroWebhookPayload['data']['transaction']): Promise<void> => {
  await emailTransporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: transaction.customer_name, // Assuming this is the email
    subject: 'Payment Failed - Action Required',
    html: `
      <h1>Payment Failed</h1>
      <p>Your payment of ${transaction.currency} ${transaction.amount} was not successful.</p>
      <p>Transaction Reference: ${transaction.reference}</p>
      <p>Please try again or contact support if you need assistance.</p>
    `
  });
};

// Real-time notifications via WebSocket
const notifyPaymentSuccess = async (transactionId: string): Promise<void> => {
  const ws = wsConnections.get(transactionId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'PAYMENT_SUCCESS',
      transactionId
    }));
  }
};

const notifyPaymentFailure = async (transactionId: string): Promise<void> => {
  const ws = wsConnections.get(transactionId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'PAYMENT_FAILED',
      transactionId
    }));
  }
};

const notifyPaymentPending = async (transactionId: string): Promise<void> => {
  const ws = wsConnections.get(transactionId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'PAYMENT_PENDING',
      transactionId
    }));
  }
};

// Ticket management
const generateTicketData = async (transaction: PayHeroWebhookPayload['data']['transaction']) => {
  // Implement ticket data generation based on your requirements
  return {
    transactionId: transaction.id,
    reference: transaction.reference,
    customerName: transaction.customer_name,
    amount: transaction.amount,
    currency: transaction.currency,
    purchaseDate: new Date(),
    // Add other ticket-specific fields
  };
};

const releaseTicketHold = async (reference: string): Promise<void> => {
  await prisma.ticketHold.delete({
    where: { reference }
  });
};

const extendTicketHold = async (reference: string): Promise<void> => {
  await prisma.ticketHold.update({
    where: { reference },
    data: {
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // Extend by 15 minutes
    }
  });
};

// Webhook signature verification
export const verifyWebhookSignature = (payload: PayHeroWebhookPayload, signature: string, secret: string): boolean => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
    
  return `sha256=${expectedSignature}` === signature;
};

// WebSocket connection management
export const registerWebSocketConnection = (transactionId: string, ws: WebSocket): void => {
  wsConnections.set(transactionId, ws);
  
  ws.on('close', () => {
    wsConnections.delete(transactionId);
  });
};
