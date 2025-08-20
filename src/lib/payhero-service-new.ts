import { 
  PAYHERO_CONFIG, 
  PAYHERO_ENDPOINTS
} from './payhero-config';

import type {
  PayHeroResponse,
  PayHeroStatusResponse
} from './payhero-types';

interface STKPushRequest {
  amount: number;
  customerName: string;
  phoneNumber: string;
  provider: string;
  reference?: string;
}

class PayHeroService {
  private channelId: string;
  private callbackUrl: string;

  constructor() {
    this.channelId = PAYHERO_CONFIG.CHANNEL_ID;
    this.callbackUrl = PAYHERO_CONFIG.CALLBACK_URL;
  }

  private generateReference(): string {
    return `CHAN${Date.now().toString()}`;
  }

  validatePhoneNumber(phoneNumber: string): { isValid: boolean; formattedNumber?: string; error?: string } {
    try {
      // Remove any spaces, hyphens, or other separators
      let cleaned = phoneNumber.replace(/\D/g, '');

      // If the number starts with 0, replace it with 254
      if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.slice(1);
      }
      // If the number starts with +, remove it
      else if (cleaned.startsWith('+')) {
        cleaned = cleaned.slice(1);
      }
      // If the number doesn't start with 254, add it
      else if (!cleaned.startsWith('254')) {
        cleaned = '254' + cleaned;
      }

      // Check if the number is a valid Kenyan phone number
      // Should be 12 digits (254 + 9 digits)
      if (cleaned.length !== 12) {
        return {
          isValid: false,
          error: 'Phone number must be 9 digits excluding the country code'
        };
      }

      // Check if it's a valid Safaricom number (254 7xx xxx xxx)
      if (!cleaned.match(/^254(7[0-9]{8})$/)) {
        return {
          isValid: false,
          error: 'Please enter a valid Safaricom number (07xx xxx xxx)'
        };
      }

      return {
        isValid: true,
        formattedNumber: cleaned
      };

    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid phone number format'
      };
    }
  }

  async initiateSTKPush({
    amount,
    customerName,
    phoneNumber,
    provider,
    reference
  }: STKPushRequest): Promise<PayHeroResponse> {
    try {
      // Format and validate phone number
      const validation = this.validatePhoneNumber(phoneNumber);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid phone number');
      }
      const formattedPhone = validation.formattedNumber!;

      const paymentReference = reference || this.generateReference();

      const requestBody = {
        amount: Number(amount),
        phone_number: formattedPhone,
        channel_id: Number(this.channelId),
        provider: 'm-pesa',
        external_reference: paymentReference,
        customer_name: customerName,
        callback_url: this.callbackUrl
      };

      // Log complete request details for debugging
      console.log('PayHero API Request:', {
        url: `${PAYHERO_CONFIG.BASE_URL}${PAYHERO_ENDPOINTS.INITIATE_PAYMENT}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Basic ***' // Masked for security
        },
        body: {
          ...requestBody,
          phone_number: formattedPhone.slice(0, 6) + '****' + formattedPhone.slice(-2)
        }
      });

      const url = `${PAYHERO_CONFIG.BASE_URL}${PAYHERO_ENDPOINTS.INITIATE_PAYMENT}`;
      const headers = { 
        'Content-Type': 'application/json', 
        'Accept': 'application/json',
        'Authorization': PAYHERO_CONFIG.AUTH_TOKEN
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      // Read response as text first for better error handling
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', responseText);
        throw new Error(`Invalid response format: ${responseText.substring(0, 100)}...`);
      }

      // Log the complete response for debugging
      console.log('PayHero API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers]),
        data
      });

      if (!response.ok) {
        throw new Error(`PayHero API Error: ${response.status} - ${data.message || response.statusText || 'Unknown error'}`);
      }

      return {
        success: true,
        status: data.status,
        reference: data.reference,
        CheckoutRequestID: data.CheckoutRequestID
      };

    } catch (error) {
      console.error('PayHero STK Push Error:', error);
      return {
        success: false,
        error: {
          code: 'PAYMENT_INITIATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error
        }
      };
    }
  }

  async checkPaymentStatus(transactionId: string): Promise<PayHeroStatusResponse> {
    try {
      const url = `${PAYHERO_CONFIG.BASE_URL}${PAYHERO_ENDPOINTS.CHECK_STATUS}/${transactionId}`;
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': PAYHERO_CONFIG.AUTH_TOKEN
      };

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse status response:', responseText);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(`PayHero API Error: ${response.status} - ${data.message || response.statusText || 'Unknown error'}`);
      }

      return {
        success: true,
        transaction: data.transaction
      };

    } catch (error) {
      console.error('PayHero Status Check Error:', error);
      return {
        success: false,
        error: {
          code: 'STATUS_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error
        }
      };
    }
  }
}

export const payHeroService = new PayHeroService();
