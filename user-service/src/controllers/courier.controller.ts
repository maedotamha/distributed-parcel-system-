
import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { userProducer } from '../events/producers/user.producer';


export const getCourierProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const profile = await prisma.courier_profiles.findUnique({
      where: { user_id: userId },
      include: {
        vehicles: true,
        courier_availability: true
      }
    });

    if (!profile) {
      res.status(404).json({ message: 'Courier profile not found' });
      return;
    }

    res.json(profile);
  } catch (error) {
    console.error('Get courier profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const { status } = req.body; // AVAILABLE, BUSY, OFF_DUTY

    await prisma.courier_profiles.update({
      where: { user_id: userId },
      data: { 
        status,
        is_online: status === 'AVAILABLE'
      }
    });

    // Publish Status Changed Event
    await userProducer.publishCourierStatusChanged(userId!, status);

    res.json({ message: 'Status updated successfully', status });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const { latitude, longitude } = req.body;

    await prisma.courier_profiles.update({
      where: { user_id: userId },
      data: {
        current_latitude: latitude,
        current_longitude: longitude,
        last_location_update: new Date()
      }
    });

    // Publish Location Updated Event
    await userProducer.publishCourierLocationUpdated(userId!, latitude, longitude);

    res.json({ message: 'Location updated' });

  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    // We need the courier_profile_id first
    const profile = await prisma.courier_profiles.findUnique({ where: { user_id: userId } });
    
    if (!profile) {
       res.status(404).json({ message: 'Profile not found' });
       return;
    }

    const { vehicle_type, make, model, license_plate } = req.body;

    const vehicle = await prisma.vehicles.create({
      data: {
        courier_profile_id: profile.courier_profile_id,
        vehicle_type,
        make,
        model,
        license_plate // assuming unique constraint is handled by catch
      }
    });

    res.status(201).json(vehicle);
  } catch (error) {
    console.error('Add vehicle error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const profile = await prisma.courier_profiles.findUnique({ where: { user_id: userId } });
    if (!profile) return; // Should handle error better but keeping concise

    const { day_of_week, start_time, end_time } = req.body;

    // Note: start_time and end_time need to be valid strings or Date objects depending on Prisma mapping
    // Postgres TIME maps to Date object in JS usually (with dummy date) or string
    // Let's assume string for now and let Prisma handle casting if mapped to DateTime, or string if String.
    // Init script said "TIME", prisma usually maps this to Date object (1970-01-01 + time).
    // We'll need to parse 'HH:MM' to a Date object.

    const parseTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return date;
    };

    const availability = await prisma.courier_availability.create({
      data: {
        courier_profile_id: profile.courier_profile_id,
        day_of_week,
        start_time: parseTime(start_time),
        end_time: parseTime(end_time)
      }
    });

    res.status(201).json(availability);
  } catch (error) {
    console.error('Add availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
