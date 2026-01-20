import { Request, Response } from "express";
import prisma from "../config/database";
import axios from "axios";
import { paymentProducer } from "../events/producers/payment.producer";

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY!;
const BASE_URL = process.env.BASE_URL || "http://localhost:5173";

export const initiatePayment = async (req: Request, res: Response) => {
  try {
    console.log("CHAPA KEY:", CHAPA_SECRET_KEY?.slice(0, 10));

    const { orderId, first_name, last_name, email, phone_number, amount } = req.body;
    if (!orderId || !first_name || !last_name || !email || !amount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Find or get payment record
    let payment = await prisma.payment.findFirst({ where: { order_id: orderId } });

    if (!payment) {
      return res.status(404).json({ message: "Payment record not found for this order" });
    }

    // Generate a shorter tx_ref (Chapa limit is 50 chars)
    // Format: TX-{timestamp}-{last 12 chars of orderId}
    // Example: TX-1704222000000-a1b2c3d4e5f6 (approx 29 chars)
    const shortOrderId = orderId.split('-').pop();
    const tx_ref = `TX-${Date.now()}-${shortOrderId}`;

    // Update payment with gateway reference and amount
    payment = await prisma.payment.update({
      where: { payment_id: payment.payment_id },
      data: {
        gateway_reference: tx_ref,
        amount: Number(amount),
        status: 'PROCESSING'
      }
    });

    // Initialize Chapa transaction
    const { data } = await axios.post(
      "https://api.chapa.co/v1/transaction/initialize",
      {
        amount: Number(amount),
        currency: "ETB",
        email,
        first_name,
        last_name,
        phone_number,
        tx_ref,
        callback_url: `${BASE_URL}/api/payments/verify?trx_ref=${tx_ref}`,
        return_url: `${BASE_URL}/payment/success?orderId=${orderId}`,
        "customization[title]": "Order Payment",
        "customization[description]": `Payment for order ${orderId}`,
      },
      {
        headers: {
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (data.status === "success") {
      return res.json({ checkout_url: data.data.checkout_url });
    } else {
      // Update payment status to failed
      await prisma.payment.update({
        where: { payment_id: payment.payment_id },
        data: { status: 'FAILED' }
      });
      await paymentProducer.publishPaymentFailed(payment, data.message || "Chapa initialization failed");
      return res.status(400).json({ message: data.message || "Chapa error" });
    }
  } catch (err: any) {
    console.error(err.response?.data || err.message || err);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { trx_ref } = req.query;
    const { data } = await axios.get(
      `https://api.chapa.co/v1/transaction/verify/${trx_ref}`,
      {
        headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` },
      }
    );

    if (data.status === "success" && data.data.status === "success") {
      const updatedPayment = await prisma.payment.update({
        where: { gateway_reference: String(trx_ref) },
        data: {
          status: 'CAPTURED',
          gateway_transaction_id: data.data.reference,
          captured_amount: parseFloat(data.data.amount),
          captured_at: new Date(),
        },
      });

      // Publish payment completed event
      await paymentProducer.publishPaymentCompleted(updatedPayment);

      return res.json({ message: "Payment verified and completed", data: updatedPayment });
    } else {
      // Payment failed
      const payment = await prisma.payment.findUnique({
        where: { gateway_reference: String(trx_ref) }
      });

      if (payment) {
        const updatedPayment = await prisma.payment.update({
          where: { gateway_reference: String(trx_ref) },
          data: { status: 'FAILED' }
        });
        await paymentProducer.publishPaymentFailed(updatedPayment, "Payment verification failed");
      }

      return res.status(400).json({ message: "Payment not successful", data });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during verification." });
  }
};
