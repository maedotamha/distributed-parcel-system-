//C:\Users\HP\Documents\5(1ST SEMESTER)\ds\u\distributed-parcel-delivery-system\distributed-parcel-delivery-system\payment-service\src\routes\payment.routes.ts
import { Router } from "express";
import { initiatePayment, verifyPayment } from "../controllers/chappa.controller";
import { getPaymentByOrderId, estimatePricing } from "../controllers/payment.controller";

const router = Router();

router.post("/initiate", initiatePayment);
router.post("/estimate-price", estimatePricing);
router.get("/verify", verifyPayment);
router.get("/order/:orderId", getPaymentByOrderId);

export default router;
