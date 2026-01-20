import * as amqp from 'amqplib';
import { Channel } from 'amqplib';
import logger from './logger';
import { v4 as uuidv4 } from 'uuid';

class RabbitMQService {
  private connection: any = null;
  private channel: Channel | null = null;
  private isConnected = false;
  private readonly exchange = 'delivery_exchange';

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      const url = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
      logger.info(`Connecting to RabbitMQ at ${url}...`);

      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      // ❗ Non-null assertion fixes TypeScript error
      await this.channel!.assertExchange(this.exchange, 'topic', { durable: true });

      this.isConnected = true;
      console.log('✅ Connected to RabbitMQ');

      // Reconnect on close or error
      this.connection.on('close', () => {
        console.error('❌ RabbitMQ connection closed. Reconnecting...');
        this.isConnected = false;
        setTimeout(() => this.connect(), 3000);
      });

      this.connection.on('error', () => {
        console.error('❌ RabbitMQ error:');

        this.isConnected = false;
      });

    } catch (error) {
      console.error('❌ Failed to connect to RabbitMQ:', error);
      setTimeout(() => this.connect(), 5000);
    }
  }


  async publish(routingKey: string, data: any): Promise<boolean> {
    if (!this.channel) {
      logger.error('Cannot publish, channel is null');
      return false;
    }

    // Ensure data has an eventId for idempotency
    if (!data.eventId) {
      data.eventId = uuidv4();
    }

    const content = Buffer.from(JSON.stringify(data));
    logger.info(`📤 Publishing to "${routingKey}": ${JSON.stringify(data).substring(0, 100)}...`);
    return this.channel.publish(this.exchange, routingKey, content, {
      persistent: true,
      messageId: data.eventId
    });
  }

  async subscribe(routingKey: string, queueName: string, callback: (data: any) => Promise<void>): Promise<void> {
    if (!this.channel) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!this.channel) return;
    }

    const deadLetterExchange = `${this.exchange}.dlx`;
    const deadLetterQueue = `${queueName}.dlq`;

    // 1. Setup Dead Letter Exchange and Queue
    await this.channel.assertExchange(deadLetterExchange, 'topic', { durable: true });
    await this.channel.assertQueue(deadLetterQueue, { durable: true });
    await this.channel.bindQueue(deadLetterQueue, deadLetterExchange, '#'); // Bind all to DLQ

    // 2. Setup Main Queue with DLQ arguments
    await this.channel.assertQueue(queueName, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': deadLetterExchange,
        'x-dead-letter-routing-key': routingKey
      }
    });
    await this.channel.bindQueue(queueName, this.exchange, routingKey);

    console.log(`📥 Subscribed to "${routingKey}" via queue "${queueName}" (DLQ enabled)`);

    this.channel.consume(queueName, async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString());
        await callback(content);
        this.channel?.ack(msg);
      } catch (err) {
        console.error(`❌ Error processing message from ${queueName}:`, err);

        // Handle Retries
        const headers = msg.properties.headers || {};
        const retryCount = (headers['x-retry-count'] || 0) as number;
        const maxRetries = 3;

        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying message (${retryCount + 1}/${maxRetries})...`);

          // Small delay before retrying by publishing back to the same queue after a delay
          // In a production app, use a dedicated delay exchange/queue
          setTimeout(async () => {
            try {
              if (this.channel) {
                this.channel.publish(this.exchange, routingKey, msg.content, {
                  headers: { ...headers, 'x-retry-count': retryCount + 1 },
                  persistent: true
                });
                this.channel.ack(msg);
              }
            } catch (pErr) {
              console.error('Failed to republish for retry:', pErr);
              this.channel?.nack(msg, false, false); // Send to DLQ
            }
          }, 2000 * Math.pow(2, retryCount)); // Exponential backoff
        } else {
          console.error(`💀 Max retries reached for message. Moving to DLQ.`);
          this.channel?.nack(msg, false, false); // requeue: false triggers DLQ
        }
      }
    });
  }
}

export const rabbitMQ = new RabbitMQService();
