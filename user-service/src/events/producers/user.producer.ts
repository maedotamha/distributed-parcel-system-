//C:\Users\HP\Documents\5(1ST SEMESTER)\ds\u\distributed-parcel-delivery-system\distributed-parcel-delivery-system\user-service\src\events\producers\user.producer.ts
import { rabbitMQ } from '../../config/rabbitmq';

export class UserProducer {
  
  async publishUserCreated(user: any) {
    await rabbitMQ.publish('user.created', {
      user_id: user.user_id,
      email: user.email,
      role: user.user_role,
      first_name: user.first_name,
      timestamp: new Date()
    });
  }

  async publishUserUpdated(user: any) {
    await rabbitMQ.publish('user.updated', {
      user_id: user.user_id,
      email: user.email,
      role: user.user_role,
      timestamp: new Date()
    });
  }

  async publishCourierStatusChanged(userId: string, status: string) {
    await rabbitMQ.publish('courier.status_changed', {
      user_id: userId,
      status: status,
      timestamp: new Date()
    });
  }

  async publishCourierLocationUpdated(userId: string, lat: number, lng: number) {
    await rabbitMQ.publish('courier.location_updated', {
      user_id: userId,
      latitude: lat,
      longitude: lng,
      timestamp: new Date()
    });
  }

  async publishUserDeleted(userId: string) {
    await rabbitMQ.publish('user.deleted', {
      user_id: userId,
      timestamp: new Date()
    });
  }
}

export const userProducer = new UserProducer();

