//user-service\src\test-db.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://delivery_user:YourStrongPassword123@localhost:5435/user_service_db"
    }
  }
});

async function main() {
  console.log('Connecting to database...');
  try {
    const users = await prisma.users.findMany();
    console.log('Successfully connected!');
    console.log(`Found ${users.length} users in the database.`);
    
    // Check if we can describe the table structure (implicit proof)
    console.log('Test complete. Database connection is working.');
  } catch (error) {
    console.error('Error connecting to database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
