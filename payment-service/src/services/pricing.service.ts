import { PrismaClient } from '@prisma/client';
import prisma from '../config/database';

export interface PricingEstimateRequest {
  priority: string;
  weightKg: number;
  pickupSubcity: string;
  deliverySubcity: string;
}

export interface PricingEstimateResponse {
  baseFee: number;
  distanceFee: number;
  weightFee: number;
  priorityFee: number;
  totalAmount: number;
  currency: string;
}

// Mock distance mapping between subcities (simplified for demo)
// In a real app, this would use a Maps API (Google/OSM)
const subcityDistances: Record<string, number> = {
  'ARADA': 2,
  'BOLE': 8,
  'AKAKI_KALITY': 15,
  'ADDIS_KETEMA': 4,
  'KIRKOS': 3,
  'KOLFE_KERANIO': 9,
  'LIDETA': 5,
  'NIFAS_SILK_LAFTO': 10,
  'YEKA': 7,
  'GULLELE': 6
};

export class PricingService {
  /**
   * Calculate delivery fees based on order details
   */
  static calculateFees(data: PricingEstimateRequest): PricingEstimateResponse {
    const { priority, weightKg, pickupSubcity, deliverySubcity } = data;

    // 1. Base Fee
    const baseFee = 50.00;

    // 2. Distance Calculation (Mock)
    const dist1 = subcityDistances[pickupSubcity.toUpperCase()] || 5;
    const dist2 = subcityDistances[deliverySubcity.toUpperCase()] || 5;
    const estimatedDistanceKm = Math.abs(dist1 - dist2) + 2; // +2 for base travel
    const distanceFee = estimatedDistanceKm * 15.00;

    // 3. Weight Surcharge
    let weightFee = 0;
    if (weightKg > 2) {
      weightFee = (weightKg - 2) * 10.00;
    }

    // 4. Priority Multiplier
    let priorityMultiplier = 1.0;
    if (priority === 'EXPRESS') priorityMultiplier = 1.5;
    if (priority === 'SAME_DAY') priorityMultiplier = 2.0;

    const subtotal = baseFee + distanceFee + weightFee;
    const totalAmount = subtotal * priorityMultiplier;
    const priorityFee = totalAmount - subtotal;

    return {
      baseFee,
      distanceFee,
      weightFee,
      priorityFee,
      totalAmount: Math.round(totalAmount * 100) / 100,
      currency: 'ETB'
    };
  }

  /**
   * Create a price calculation record in the database
   */
  static async saveCalculation(orderId: string, estimate: PricingEstimateResponse, params: any) {
    try {
      return await (prisma as any).deliveryFeeCalculation.create({
        data: {
          order_id: orderId,
          base_fee: estimate.baseFee,
          distance_fee: estimate.distanceFee,
          total_amount: estimate.totalAmount,
          subtotal: estimate.baseFee + estimate.distanceFee + estimate.weightFee,
          calculation_parameters: params,
          is_applied: true
        }
      });
    } catch (error) {
      console.error('Failed to save pricing calculation:', error);
    }
  }
}
