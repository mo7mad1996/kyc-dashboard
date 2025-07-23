# Multi-Region KYC Dashboard

**Author:** Mohammed Ibrahim
**Phone:** 01063525389
**Email:** [mo7mad369@gmail.com](mailto:mo7mad369@gmail.com)

A comprehensive fintech dashboard for managing KYC (Know Your Customer) operations across multiple regions with real-time audit logging and role-based access control.

## 🚀 Features

### Core Functionality

- **Role-Based Access Control (RBAC)**: Four distinct user roles with granular permissions

  - Global Admin: Full system access
  - Regional Admin: Region-specific management
  - Sending Partner: Transaction creation and monitoring
  - Receiving Partner: Transaction receiving and compliance

- **Real-Time Transaction Management**: Complete transaction lifecycle with status tracking

- **Cybrid API Integration**: Mock USD/USDC conversion with real-time exchange rates

- **Comprehensive Audit Logging**: Every action tracked with detailed metadata

- **Advanced Filtering & Search**: Real-time data filtering across all modules

### Security & Compliance

- **JWT Authentication**: Secure token-based authentication
- **Audit Trail Integrity**: Immutable logging of all system activities
- **PCI-DSS Ready Architecture**: Security best practices implemented
- **Role-Based Data Isolation**: Users only see data they're authorized to access
- **Rate Limiting**: Protection against abuse and DoS attacks

## 🛠 Installation & Setup

1. Rename `.env.example` to `.env` and configure your environment variables.

2. Install dependencies and start the project:

```bash
npm install
npm run dev
```

## 📊 Architecture Overview

### Backend Structure

```
server/
├── config/          # Database and environment configuration
├── middleware/      # Authentication, authorization, error handling
├── models/          # Data models and mock data
├── routes/          # API endpoints
├── services/        # Business logic (audit, Cybrid integration)
└── index.ts         # Server entry point
```

### Frontend Structure

```
src/
├── components/      # Reusable UI components
├── contexts/        # React contexts (Auth)
├── pages/           # Main application pages
├── services/        # API integration
└── App.tsx          # Main application component
```

## 🔒 Security Measures

- **Authentication Flow:** JWT tokens with 24h expiration and bcrypt hashing
- **Authorization:** Role-based middleware and permission-level access
- **Audit Logging:** IP/user-agent tracking; real-time filtering and export
- **Data Protection:** Input validation, sanitization, XSS/SQL injection prevention

## 🔧 API Endpoints

### Authentication

- `POST /api/auth/login` - User authentication
- `GET /api/auth/me` - Get current user info

### Transactions

- `GET /api/transactions` - List transactions (role-filtered)
- `GET /api/transactions/:id` - Get transaction details
- `POST /api/transactions` - Create new transaction
- `PATCH /api/transactions/:id/status` - Update transaction status

### Audit Logs

- `GET /api/audit` - Get audit logs
- `GET /api/audit/stats` - Get audit statistics

### Cybrid Integration

- `GET /api/cybrid/rates` - Get exchange rates
- `GET /api/cybrid/currencies` - Get supported currencies
- `POST /api/cybrid/convert` - Calculate conversion

## 🔧 API Endpoints

### Authentication

- `POST /api/auth/login` - User authentication
- `GET /api/auth/me` - Get current user info

### Transactions

- `GET /api/transactions` - List transactions (role-filtered)
- `GET /api/transactions/:id` - Get transaction details
- `POST /api/transactions` - Create new transaction
- `PATCH /api/transactions/:id/status` - Update transaction status

### Audit Logs

- `GET /api/audit` - Get audit logs
- `GET /api/audit/stats` - Get audit statistics

### Cybrid Integration

- `GET /api/cybrid/rates` - Get exchange rates
- `GET /api/cybrid/currencies` - Get supported currencies
- `POST /api/cybrid/convert` - Calculate conversion

### Swagger UI

Access the interactive API documentation at:

```
http://localhost:3001/swagger
```
