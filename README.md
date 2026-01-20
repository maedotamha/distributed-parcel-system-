# Distributed Parcel Delivery & Tracking System

## Project Overview
![CI Status](https://img.shields.io/github/actions/workflow/status/meklithab/distributed-parcel-delivery-system/ci.yml?branch=meklit-branch&label=CI%2FCD%20Pipeline)

This project implements a **distributed parcel delivery system** using microservices and a **Pub/Sub messaging pattern**. It allows customers to create shipment requests, track their packages, and receive real-time updates. The system is designed for **scalability, reliability, and real-time communication**.

> [!IMPORTANT]
> **[Read the Full Technical Documentation & Report here](./Project_Documentation.md)**

---

## Team Members

| Name | Email | Role |
|------|-------|------|
| Liya Tsegaye | liyatsegaye2301@gmail.com | Project Lead |
| Maedot Amha | maedotamha@gmail.com | Backend Developer |
| Marsilas Wondimagegnehu | marsilasw0@gmail.com | Integration Engineer |
| Meklit Habtamu | mkedu101@gmail.com | Testing / QA Engineer |
| Meklit Melkamu | meklitmelkamu34@gmail.com | DevOps / Deployment |
| Melat Mekonnen | melatmek8@gmail.com | Documentation Lead / Frontend Developer |

---

## Problem Statement
Parcel delivery platforms require several independent backend components to work together so customers can create shipment requests, track their packages, and receive real-time updates. Monolithic applications struggle with scalability and real-time event handling. This project addresses these challenges by implementing a distributed system with microservices and asynchronous messaging.

---

## Objectives
- Implement three independent microservices: **Package Service**, **User Service**, and **Notification Service**.
- Use **REST** for synchronous operations (e.g., package creation, tracking queries).
- Use **Kafka/RabbitMQ/Redis Streams** for asynchronous events.
- Deploy all services with **Docker Compose**.
- Produce professional documentation including **API specs**, **event schemas**, and **system architecture**.

---

## Proposed Architecture
The system consists of three independent microservices:

1. **Package Service**: Registers customer shipment requests and publishes `package.created` events.
2. **User Service**: Manages customer and courier information, subscribes to package.created events to validate sender/receiver IDs, and publishes user.updated events when user or courier data changes.
3. **Notification Service**: Subscribes to status updates and notifies customers in real time.


---

## Repository Setup Instructions

1. **Clone the repository**  
   ```bash
   git clone https://github.com/meklithab/distributed-parcel-delivery-system
   cd distributed-parcel-delivery-system

