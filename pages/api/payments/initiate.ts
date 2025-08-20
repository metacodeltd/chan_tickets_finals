// Next.js API route: Initiates PayHero STK Push
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const response = await fetch("https://backend.payhero.co.ke/api/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + Buffer.from(
          process.env.PAYHERO_KEY + ":" + process.env.PAYHERO_SECRET
        ).toString("base64"),
      },
      body: JSON.stringify(req.body),
    });

    const text = await response.text(); // PayHero sometimes returns empty
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      console.error("Non-JSON response from PayHero:", text);
    }

    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error("Payment initiation error:", error);
    return res.status(500).json({ success: false, message: "Payment initiation failed" });
  }
}
