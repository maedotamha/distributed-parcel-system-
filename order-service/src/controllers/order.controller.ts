import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { orderProducer } from '../events/producers/order.producer';


/**
 * Generate a unique order number
 */
const generateOrderNumber = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
};

/**
 * Generate a unique parcel number
 */
const generateParcelNumber = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PCL-${timestamp}-${random}`;
};

/**
 * Create a new order with addresses and parcels
 */
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const {
      priority,
      serviceType,
      scheduledPickupTime,
      scheduledDeliveryTime,
      notes,
      addresses,
      parcels
    } = req.body;

    // Validate required fields
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      res.status(400).json({ message: 'At least one address is required' });
      return;
    }

    if (!parcels || !Array.isArray(parcels) || parcels.length === 0) {
      res.status(400).json({ message: 'At least one parcel is required' });
      return;
    }

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Create order with nested relations
    const order = await (prisma as any).order.create({
      data: {
        orderNumber,
        customerId: userId!,
        priority: (priority as any) || 'STANDARD',
        serviceType: (serviceType as any) || 'DOOR_TO_DOOR',
        status: 'PENDING' as any,
        scheduledPickupTime: scheduledPickupTime ? new Date(scheduledPickupTime) : null,
        scheduledDeliveryTime: scheduledDeliveryTime ? new Date(scheduledDeliveryTime) : null,
        notes,
        addresses: {
          create: addresses.map((addr: any) => ({
            addressType: addr.addressType as any,
            contactName: addr.contactName,
            contactPhone: addr.contactPhone,
            contactEmail: addr.contactEmail,
            streetAddress: addr.streetAddress,
            subcity: addr.subcity,
            kebele: addr.kebele,
            woreda: addr.woreda,
            houseNumber: addr.houseNumber,
            landmark: addr.landmark,
            instructions: addr.instructions
          }))
        },
        parcels: {
          create: parcels.map((parcel: any) => ({
            parcelNumber: generateParcelNumber(),
            description: parcel.description,
            weightKg: parcel.weightKg,
            lengthCm: parcel.lengthCm,
            widthCm: parcel.widthCm,
            heightCm: parcel.heightCm,
            declaredValue: parcel.declaredValue,
            category: parcel.category,
            isFragile: parcel.isFragile || false,
            isPerishable: parcel.isPerishable || false,
            requiresSignature: parcel.requiresSignature || false,
            insuranceAmount: parcel.insuranceAmount,
            items: parcel.items ? {
              create: parcel.items.map((item: any) => ({
                sku: item.sku,
                name: item.name,
                description: item.description,
                quantity: item.quantity,
                unitValue: item.unitValue
              }))
            } : undefined
          }))
        },
        trackingEvents: {
          create: {
            eventType: 'ORDER_CREATED' as any,
            eventTimestamp: new Date(),
            notes: 'Order created by customer'
          }
        }
      },
      include: {
        addresses: true,
        parcels: {
          include: {
            items: true
          }
        },
        trackingEvents: true
      }
    });


    // Publish order.created event
    await orderProducer.publishOrderCreated({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      status: order.status,
      priority: order.priority,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      createdAt: order.createdAt
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error', error: String(error) });
  }
};

/**
 * Get all orders (admin view with filtering)
 */
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, priority, customerId, courierId, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (status) where.status = status as any;
    if (priority) where.priority = priority as any;
    if (customerId) where.customerId = customerId as string;
    if (courierId) where.courierId = courierId as string;

    const orders = await (prisma as any).order.findMany({
      where,
      include: {
        addresses: true,
        parcels: {
          include: {
            items: true
          }
        },
        trackingEvents: {
          orderBy: { eventTimestamp: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const total = await (prisma as any).order.count({ where });

    res.json({
      orders,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get customer's own orders
 */
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;

    const orders = await (prisma as any).order.findMany({
      where: { customerId: userId },
      include: {
        addresses: true,
        parcels: {
          include: {
            items: true
          }
        },
        trackingEvents: {
          orderBy: { eventTimestamp: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get orders assigned to the authenticated courier
 */
export const getCourierOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const courierId = (req as AuthRequest).user?.userId;

    const orders = await (prisma as any).order.findMany({
      where: {
        courierId,
        status: {
          notIn: ['DELIVERED', 'CANCELLED', 'RETURNED'] as any
        }
      },
      include: {
        addresses: true,
        parcels: {
          include: {
            items: true
          }
        },
        trackingEvents: {
          orderBy: { eventTimestamp: 'desc' },
          take: 10
        },
        courierAssignments: {
          where: { status: 'ACTIVE' as any },
          orderBy: { assignedAt: 'desc' },
          take: 1
        }
      },
      orderBy: { scheduledPickupTime: 'asc' }
    });

    res.json(orders);
  } catch (error) {
    console.error('Get courier orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get order by ID
 */
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as AuthRequest).user?.userId;
    const userRole = (req as AuthRequest).user?.role;

    const order = await (prisma as any).order.findUnique({
      where: { orderId: id },
      include: {
        addresses: true,
        parcels: {
          include: {
            items: true
          }
        },
        trackingEvents: {
          orderBy: { eventTimestamp: 'desc' }
        },
        courierAssignments: {
          orderBy: { assignedAt: 'desc' }
        },
        deliveryProofs: true,
        locationUpdates: {
          orderBy: { recordedAt: 'desc' },
          take: 10
        }
      }
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Check authorization - customers can only see their own orders
    if (userRole === 'CUSTOMER' && order.customerId !== userId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    // Couriers can only see orders assigned to them
    if (userRole === 'COURIER' && order.courierId !== userId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    res.json(order);
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update order status (courier only)
 */
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const courierId = (req as AuthRequest).user?.userId;
    const { status, notes, latitude, longitude } = req.body;

    // Validate status
    const validStatuses = ['PENDING', 'CONFIRMED', 'ASSIGNED_TO_COURIER', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED', 'RETURNED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    // Find the order
    const order = await (prisma as any).order.findUnique({
      where: { orderId: id }
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Verify courier is assigned to this order
    if (order.courierId !== courierId) {
      res.status(403).json({ message: 'You are not assigned to this order' });
      return;
    }

    const oldStatus = order.status;

    // Update order status
    const updatedOrder = await (prisma as any).order.update({
      where: { orderId: id },
      data: {
        status: status as any,
        actualDeliveryTime: status === 'DELIVERED' ? new Date() : order.actualDeliveryTime,
        updatedAt: new Date()
      },
      include: {
        addresses: true,
        parcels: true
      }
    });

    // Map status to tracking event type
    const eventTypeMap: Record<string, any> = {
      'PICKED_UP': 'PARCEL_PICKED_UP',
      'IN_TRANSIT': 'IN_TRANSIT',
      'OUT_FOR_DELIVERY': 'OUT_FOR_DELIVERY',
      'DELIVERED': 'DELIVERED',
      'FAILED': 'FAILED',
      'RETURNED': 'RETURNED',
      'ASSIGNED_TO_COURIER': 'COURIER_ASSIGNED',
      'PENDING': 'ORDER_CREATED',
      'CONFIRMED': 'ORDER_CONFIRMED',
      'CANCELLED': 'CANCELLED'
    };

    const eventType = eventTypeMap[status as string];

    if (eventType) {
      // Create tracking event
      await (prisma as any).trackingEvent.create({
        data: {
          orderId: id,
          eventType,
          eventTimestamp: new Date(),
          locationText: notes,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          courierId,
          notes
        }
      });
    }

    // Publish status changed event
    await orderProducer.publishOrderStatusChanged({
      orderId: updatedOrder.orderId,
      orderNumber: updatedOrder.orderNumber,
      customerId: updatedOrder.customerId,
      oldStatus,
      newStatus: updatedOrder.status,
      courierId
    });

    // If delivered, publish order completed event
    if (status === 'DELIVERED') {
      await orderProducer.publishOrderCompleted({
        orderId: updatedOrder.orderId,
        orderNumber: updatedOrder.orderNumber,
        customerId: updatedOrder.customerId,
        courierId,
        actualDeliveryTime: updatedOrder.actualDeliveryTime
      });
    }

    res.json(updatedOrder);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Assign courier to an order
 */
export const assignCourier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { courierId, vehicleId } = req.body;

    if (!courierId) {
      res.status(400).json({ message: 'Courier ID is required' });
      return;
    }

    // Find the order
    const order = await (prisma as any).order.findUnique({
      where: { orderId: id }
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    const oldStatus = order.status;

    // Update order with courier assignment
    const updatedOrder = await (prisma as any).order.update({
      where: { orderId: id },
      data: {
        courierId,
        vehicleId,
        status: 'ASSIGNED_TO_COURIER' as any,
        updatedAt: new Date()
      }
    });

    // Create courier assignment record
    await (prisma as any).courierAssignment.create({
      data: {
        orderId: id,
        courierId,
        vehicleId,
        status: 'ACTIVE' as any
      }
    });

    // Create tracking event
    await (prisma as any).trackingEvent.create({
      data: {
        orderId: id,
        eventType: 'COURIER_ASSIGNED' as any,
        eventTimestamp: new Date(),
        courierId,
        notes: `Courier assigned to order`
      }
    });

    // Publish order assigned event
    await orderProducer.publishOrderAssigned({
      orderId: updatedOrder.orderId,
      orderNumber: updatedOrder.orderNumber,
      customerId: updatedOrder.customerId,
      courierId,
      vehicleId
    });

    // Publish status changed event for subscribers (e.g., notifications)
    await orderProducer.publishOrderStatusChanged({
      orderId: updatedOrder.orderId,
      orderNumber: updatedOrder.orderNumber,
      customerId: updatedOrder.customerId,
      oldStatus,
      newStatus: updatedOrder.status,
      courierId
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error('Assign courier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update courier location for an order
 */
export const updateOrderLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const courierId = (req as AuthRequest).user?.userId;
    const { latitude, longitude, accuracy, speed } = req.body;

    if (!latitude || !longitude) {
      res.status(400).json({ message: 'Latitude and longitude are required' });
      return;
    }

    // Record the location update
    const location = await (prisma as any).locationUpdate.create({
      data: {
        orderId: id,
        courierId: courierId!,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracyMeters: accuracy ? parseFloat(accuracy) : null,
        speedKph: speed ? parseFloat(speed) : null,
        recordedAt: new Date()
      }
    });

    res.status(201).json(location);
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Submit proof of delivery
 */
export const submitDeliveryProof = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { proofType, recipientName, recipientRelation, signatureImageUrl, photoUrls } = req.body;

    const proof = await (prisma as any).deliveryProof.create({
      data: {
        orderId: id,
        proofType: proofType as any,
        recipientName,
        recipientRelation,
        signatureImageUrl,
        photoUrls: photoUrls || [],
        deliveredAt: new Date()
      }
    });

    // Create a tracking event for this
    await (prisma as any).trackingEvent.create({
      data: {
        orderId: id,
        eventType: 'DELIVERED',
        eventTimestamp: new Date(),
        notes: `Delivery proof submitted: ${proofType}`
      }
    });

    res.status(201).json(proof);
  } catch (error) {
    console.error('Submit proof error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
