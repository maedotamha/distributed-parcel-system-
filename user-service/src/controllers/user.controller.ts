
import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { userProducer } from '../events/producers/user.producer';


export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;

    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      include: {
        customer_profiles: true,
        courier_profiles: true
      }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const { password_hash, ...userWithoutPass } = user;
    res.json(userWithoutPass);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const { first_name, last_name, phone_number } = req.body;

    const updatedUser = await prisma.users.update({
      where: { user_id: userId },
      data: {
        first_name,
        last_name,
        phone_number,
        updated_at: new Date()
      }
    });

    // Publish User Updated Event
    await userProducer.publishUserUpdated(updatedUser);

    const { password_hash, ...userWithoutPass } = updatedUser;

    res.json({ message: 'Profile updated', user: userWithoutPass });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;

    // Soft delete (deactivate)
    await prisma.users.update({
      where: { user_id: userId },
      data: { is_active: false }
    });

    // Publish User Deleted Event
    await userProducer.publishUserDeleted(userId!);

    res.json({ message: 'Account deactivated successfully' });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
