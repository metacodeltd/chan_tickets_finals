import type { NextApiRequest, NextApiResponse } from 'next';

const PAYHERO_CONFIG = {
  BASE_URL: 'https://backend.payhero.co.ke/api/v2',
  AUTH_TOKEN: 'i4BD8JfaYcLYUGGn7DvS:gjrhiBmLT2b0Jo08y9XYso8ib3NFvDh4KRkchXC4==',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { transactionId } = req.query;

  try {
    const response = await fetch(`${PAYHERO_CONFIG.BASE_URL}/api/v2/payments/${transactionId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(PAYHERO_CONFIG.AUTH_TOKEN).toString('base64')}`,
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch payment status');
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('PayHero API Error:', error);
    res.status(500).json({ message: 'Failed to check payment status' });
  }
}
