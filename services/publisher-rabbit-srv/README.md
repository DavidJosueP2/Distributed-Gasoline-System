# Outbox Publisher

Minimal NestJS-based microservice that polls Outbox tables in configured databases and publishes events to RabbitMQ.

Configuration (from environment):
- RABBITMQ_URL - AMQP connection string (defaults to amqp://guest:guest@rabbitmq:5672)
- OUTBOX_EXCHANGE - exchange to publish to (defaults to service.events)
- OUTBOX_DBS - comma-separated DB connection strings for DBs that have an `outbox` table
- PUBLISH_BATCH - number of events to process per batch (default 20)
- POLL_MS - poll interval in ms (default 500)
- OUTBOX_PUBLISHER_PORT - admin HTTP port (default 4100)

Run (dev):
1. npm install
2. npm run start:dev

Run with Docker Compose: see the project root `Docker-compose.yml` which includes the `outbox-publisher` service.
