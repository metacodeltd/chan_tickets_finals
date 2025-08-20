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
        external_reference: paymentReference || undefined, // Only include if provided
        customer_name: customerName || undefined, // Only include if provided
        callback_url: this.callbackUrl || undefined // Only include if provided
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
      console.log('Raw PayHero Response:', responseText);
      
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
        data: JSON.stringify(data, null, 2)
      });

      if (!response.ok) {
        console.error('PayHero Error Response:', data);
        let errorMsg = 'Unknown error';
        
        if (data.error_message) {
          errorMsg = data.error_message;
        } else if (data.message) {
          errorMsg = data.message;
        } else if (response.status === 404) {
          errorMsg = 'Payment endpoint not found. Please check API configuration.';
        }
        
        throw new Error(`PayHero API Error: ${response.status} - ${errorMsg}`);
      }

      // According to docs, successful response should look like:
      // {
      //   "success": true,
      //   "status": "QUEUED",
      //   "reference": "E8UWT7CLUW",
      //   "CheckoutRequestID": "ws_CO_15012024164321519708344109"
      // }
      
      if (!data.reference || !data.CheckoutRequestID) {
        console.error('Invalid PayHero Response Structure:', data);
        throw new Error('Invalid response structure from PayHero - missing reference or CheckoutRequestID');
      }

      return {
        success: true,
        status: data.status || 'QUEUED',
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

  async checkPaymentStatus(reference: string): Promise<PayHeroStatusResponse> {
    try {
      const url = `${PAYHERO_CONFIG.BASE_URL}${PAYHERO_ENDPOINTS.CHECK_STATUS}?reference=${reference}`;
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': PAYHERO_CONFIG.AUTH_TOKEN
      };

      // Log request for debugging
      console.log('PayHero Status Check Request:', {
        url,
        method: 'GET',
        headers: {
          ...headers,
          'Authorization': 'Basic ***' // Masked for security
        }
      });

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      // Read response as text first for better error handling
      const responseText = await response.text();
      console.log('Raw PayHero Status Response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse status response:', responseText);
        // If we can't parse the response, consider it pending
        return {
          success: true,
          status: 'QUEUED',
          reference: reference,
          message: 'Status check in progress'
        };
      }

      // Log the complete response for debugging
      console.log('PayHero Status API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers]),
        data: JSON.stringify(data, null, 2)
      });

      if (!response.ok) {
        console.error('PayHero Status Check Error Response:', data);
        throw new Error(`PayHero Status API Error: ${response.status} - ${data.message || response.statusText || 'Unknown error'}`);
      }

      return {
        success: true,
        status: data.status || 'PENDING',
        provider_reference: data.provider_reference,
        third_party_reference: data.third_party_reference,
        reference: reference,
        message: data.message
      };

    } catch (error) {
      console.error('PayHero Status Check Error:', error);
      // On error, consider the payment still pending
      return {
        success: true,
        status: 'QUEUED',
        reference: reference,
        message: 'Status check in progress'
      };
    }
  }
}

export const payHeroService = new PayHeroService();
