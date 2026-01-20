//user-service\src\services\user.service.ts
import prisma from '../config/database';
import bcrypt from 'bcrypt';

import { userProducer } from '../events/producers/user.producer';


export class UserService {
  
  // Create a new user (Customer or Courier)
  async createUser(userData: any) {
    const { 
      email, 
      phone_number, 
      password, 
      first_name, 
      last_name, 
      user_role 
    } = userData;

    // Check if user already exists
    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [
          { email },
          { phone_number }
        ]
      }
    });

    if (existingUser) {
      throw new Error('User with this email or phone number already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user in transaction to ensure profile is created too
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the main user record
      const newUser = await tx.users.create({
        data: {
          email,
          phone_number,
          password_hash,
          first_name,
          last_name,
          user_role: user_role || 'CUSTOMER',
          is_active: true,
          is_verified: false 
        }
      });

      // 2. Create the specific profile based on role
      if (newUser.user_role === 'CUSTOMER') {
        await tx.customer_profiles.create({
          data: {
            user_id: newUser.user_id,
            preferred_notification_method: 'SMS'
          }
        });
      } else if (newUser.user_role === 'COURIER') {
        // Couriers need extra info, but for registration we just create the placeholder
        // Manager will update details later
        await tx.courier_profiles.create({
          data: {
            user_id: newUser.user_id,
            hire_date: new Date(),
            status: 'OFF_DUTY'
          }
        });
      }

      return newUser;
    });

    // Publish User Created Event
    await userProducer.publishUserCreated(result);

    // Remove password from return object

    const { password_hash: _, ...userWithoutPassword } = result;
    return userWithoutPassword;
  }

  // Find user by email (for login)
  async findByEmail(email: string) {
    return prisma.users.findUnique({
      where: { email }
    });
  }
}
