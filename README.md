# Transaction Ledger API

A robust, production-grade financial ledger REST API built with **Node.js**, **Express**, **TypeScript**, and **Prisma ORM**. Designed for strict data integrity, ACID transactional atomicity, idempotency, and double-spend protection.

---

## 🌐 Live Deployment & Links
* **Live API Base URL:** [https://confluencr-assignment-1.onrender.com](https://confluencr-assignment-1.onrender.com)
* **Live Health Check:** [https://confluencr-assignment-1.onrender.com/health](https://confluencr-assignment-1.onrender.com/health)
* **GitHub Repository:** [https://github.com/S-Khan786/confluencr-assignment-1](https://github.com/S-Khan786/confluencr-assignment-1)
* **Postman Collection:** Located at [`docs/postman_collection.json`](docs/postman_collection.json)

---

## 📋 Table of Contents
1. [Overview & Highlights](#-overview--highlights)
2. [Tech Stack](#-tech-stack)
3. [Architecture & Project Structure](#-architecture--project-structure)
4. [Getting Started (Local Setup)](#-getting-started-local-setup)
5. [Running Tests](#-running-tests)
6. [API Documentation](#-api-documentation)
   - [0. Health & Status Checks](#0-health--status-checks)
   - [1. Create Account](#1-create-account)
   - [2. Get Account Balance](#2-get-account-balance)
   - [3. Add Transaction](#3-add-transaction)
   - [4. Get Transaction History](#4-get-transaction-history)
   - [5. Bonus: Money Transfer](#5-bonus-money-transfer)
7. [Data Integrity & Concurrency Architecture](#-data-integrity--concurrency-architecture)
8. [Assumptions](#-assumptions)

---

## 🌟 Overview & Highlights

Financial ledgers require strict guarantees that traditional CRUD applications do not:
* **ACID Atomicity:** Writing a transaction record and updating an account balance must be atomic. If anything fails midway, all state is rolled back.
* **Idempotency (No Double-Spending):** Each transaction is protected by a composite unique constraint `(account_id, reference_id)`. Re-submitting the same reference ID for the same account is safely rejected without altering the balance.
* **Immutability:** Financial ledger entries are append-only. There are strictly **no** `PUT`, `PATCH`, or `DELETE` endpoints for transactions.
* **Zero Negative Balances:** Debit operations are strictly evaluated against the current balance within the transaction lock and rejected if funds are insufficient.
* **Clean Architecture:** Modular separation of concerns into Controllers, Services, Repositories, and Request Validators.

---

## 🛠 Tech Stack

* **Runtime:** Node.js (v18+)
* **Language:** TypeScript
* **Web Framework:** Express.js
* **ORM:** Prisma
* **Database:** PostgreSQL (Render Production Database) / SQLite compatible
* **Schema Validation:** Zod
* **Testing:** Vitest + Supertest

---

## 📂 Architecture & Project Structure

```
confluencr_assignment_1/
├── src/
│   ├── db/                          # Prisma database client singleton
│   ├── errors/                      # Standardized AppError hierarchy (400, 404, 409, 422, 500)
│   ├── middleware/                  # Error handler and Zod validation middlewares
│   ├── modules/
│   │   ├── accounts/                # Account controller, service, routes, validation
│   │   ├── transactions/            # Transaction controller, service, routes, validation
│   │   └── transfers/               # Bonus Transfer controller, service, routes, validation
│   ├── app.ts                       # Express application wiring & middleware configuration
│   └── server.ts                    # HTTP server bootstrap & graceful shutdown listeners
├── prisma/
│   ├── migrations/                  # Version-controlled SQL migration files
│   └── schema.prisma                # Database schema, indexes, and unique constraints
├── tests/
│   └── ledger.test.ts               # Integration test cases
├── docs/
│   └── postman_collection.json      # Ready-to-import Postman collection
├── .env.example                     # Environment variables template
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started (Local Setup)

### Prerequisites
* [Node.js](https://nodejs.org/) v18 or newer
* `npm` v9 or newer

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/S-Khan786/confluencr-assignment-1.git
cd confluencr-assignment-1
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Set your `DATABASE_URL` in `.env` to your PostgreSQL database (e.g., from Render, Supabase, or local PostgreSQL):
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE_NAME"
```

### 3. Initialize the Database
Run migrations to set up the database schema:
```bash
npm run prisma:push
# or
npx prisma migrate deploy
```

### 4. Run the Application
**Development Mode (Hot Reloading):**
```bash
npm run dev
```

**Production Build & Run:**
```bash
npm run build
npm start
```
The API will be available at `http://localhost:3000`.

---

## 🧪 Running Tests

The test suite covers integration tests verifying account creation, credit/debit balances, overdraft rejections, duplicate reference ID idempotency, pagination, sorting, and bonus money transfers.

```bash
npm test
```

---

## 📖 API Documentation

### Base URL:
* **Local:** `http://localhost:3000`
* **Production:** `https://confluencr-assignment-1.onrender.com`

### Postman Collection
A pre-configured Postman collection is available at `docs/postman_collection.json`. Simply open Postman and click **Import**.

---

### 0. Health & Status Checks
Checks whether the service is running.

* **Endpoints:** `GET /` and `GET /health`
* **Success Response (200 OK):**
```json
{
  "status": "UP",
  "message": "Transaction Ledger API is running successfully",
  "timestamp": "2026-10-28T05:42:28.499Z",
  "service": "Transaction Ledger API"
}
```

---

### 1. Create Account
Creates a new account. The balance is automatically initialized to `0.00`. The client is not allowed to set an initial balance.

* **Endpoint:** `POST /accounts`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "name": "Jane Doe"
}
```

* **Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "e96f2a63-0b1a-4dc3-81b8-eb34d3d81bcf",
    "name": "Jane Doe",
    "balance": 0,
    "created_at": "2026-10-28T10:30:00.000Z"
  }
}
```

* **Validation Error (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "name",
        "message": "Account holder name cannot be empty"
      }
    ]
  }
}
```

---

### 2. Get Account Balance
Retrieves the current balance for an account.

* **Endpoint:** `GET /accounts/:id/balance`
* **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "account_id": "e96f2a63-0b1a-4dc3-81b8-eb34d3d81bcf",
    "balance": 150.00
  }
}
```

* **Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Account with ID '...' was not found"
  }
}
```

---

### 3. Add Transaction
Adds a credit or debit transaction to an account.

* **Endpoints Supported:**
  * `POST /accounts/:id/transactions`
  * `POST /transactions` *(with `account_id` in request body)*
* **Request Body:**
```json
{
  "type": "credit",
  "amount": 100.50,
  "description": "Salary deposit",
  "reference_id": "REF-OCT-001"
}
```

* **Rules:**
  * `type`: must be `"credit"` or `"debit"`.
  * `amount`: must be greater than `0` and have at most 2 decimal places.
  * `reference_id`: unique identifier for the transaction for this account.

* **Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "7b0451ff-fb74-4b9b-9807-68b0e8b1e4a3",
    "account_id": "e96f2a63-0b1a-4dc3-81b8-eb34d3d81bcf",
    "type": "credit",
    "amount": 100.5,
    "description": "Salary deposit",
    "reference_id": "REF-OCT-001",
    "created_at": "2026-10-28T10:32:00.000Z",
    "current_balance": 100.5
  }
}
```

* **Insufficient Balance Error (422 Unprocessable Entity):**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Transaction rejected: Insufficient balance. Available: 50.00, Required: 120.00."
  }
}
```

* **Duplicate Transaction Error (409 Conflict):**
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Transaction with reference_id 'REF-OCT-001' already exists for this account."
  }
}
```

---

### 4. Get Transaction History
Retrieves transactions for an account with sorting (latest first), optional filtering by type, and pagination.

* **Endpoints Supported:**
  * `GET /accounts/:id/transactions?type=credit&page=1&limit=10`
  * `GET /transactions?account_id=:id&page=1&limit=10`
* **Query Parameters:**
  * `type` *(optional)*: `"credit"` | `"debit"`. If omitted, returns both.
  * `page` *(optional, default 1)*: Page number.
  * `limit` *(optional, default 10, max 100)*: Number of items per page.

* **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalRecords": 25,
      "totalPages": 3
    },
    "transactions": [
      {
        "id": "7b0451ff-fb74-4b9b-9807-68b0e8b1e4a3",
        "account_id": "e96f2a63-0b1a-4dc3-81b8-eb34d3d81bcf",
        "type": "credit",
        "amount": 100.5,
        "description": "Salary deposit",
        "reference_id": "REF-OCT-001",
        "created_at": "2026-10-28T10:32:00.000Z"
      }
    ]
  }
}
```

---

### 5. Bonus: Money Transfer
Atomically moves funds from a source account to a destination account.

* **Endpoint:** `POST /transfers`
* **Request Body:**
```json
{
  "source_account_id": "e96f2a63-0b1a-4dc3-81b8-eb34d3d81bcf",
  "destination_account_id": "1e457f5c-897c-47bc-805c-30b12ad3ebfa",
  "amount": 35.00,
  "reference_id": "TR-PAY-9876",
  "description": "Dinner split"
}
```

* **Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "a244199c-e35b-4ec5-a0bc-9818816fb4ef",
    "source_account_id": "e96f2a63-0b1a-4dc3-81b8-eb34d3d81bcf",
    "destination_account_id": "1e457f5c-897c-47bc-805c-30b12ad3ebfa",
    "amount": 35,
    "reference_id": "TR-PAY-9876",
    "source_balance": 65.5,
    "destination_balance": 85.0,
    "created_at": "2026-10-28T10:35:00.000Z"
  }
}
```

---

## 🔒 Data Integrity & Concurrency Architecture

1. **Transactional Boundaries (ACID):**
   * Handled using `prisma.$transaction(...)`.
   * For single transactions: Account fetch -> idempotency check -> balance check -> balance update -> transaction log insertion happen inside a single atomic boundary.
   * For money transfers: Both account updates and ledger entries are bundled into one transaction. If either account update fails, all operations roll back.

2. **Idempotency Strategy:**
   * A composite unique database index `@@unique([accountId, referenceId])` guarantees at the database level that duplicate submissions can never create duplicate transactions, even under concurrent requests.
   * Transfers enforce unique `referenceId` in the `transfers` table.

3. **Immutability:**
   * Financial ledger entries cannot be mutated or deleted. No `UPDATE` or `DELETE` API endpoints exist.

---

## 📌 Assumptions

1. **Currency & Precision:**
   * Handled in standard decimal currency with up to 2 decimal places (cents/paise).
   * Amounts must strictly be positive numbers (`amount > 0`).
2. **Account Balances:**
   * Initial balance is always `0.00`. Clients cannot override this during account creation.
   * An account's balance can never fall below `0.00` (overdrafts are disallowed).
3. **Reference ID Scope:**
   * `reference_id` is unique *per account* for individual transactions (meaning Account A and Account B can both use `REF-001` independently without collision).
   * For transfers between accounts, `reference_id` is globally unique.
4. **Production Database:**
   * The live production application is deployed on Render and backed by a PostgreSQL database instance.
