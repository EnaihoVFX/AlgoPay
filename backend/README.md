# StickerPay Backend

Express API server for StickerPay with SQLite database.

## 📋 Files

- **`index.js`** - Express API server with REST endpoints
- **`db.js`** - Database helper functions using better-sqlite3
- **`depositWatcher.js`** - Monitors Algorand blockchain for deposits
- **`data.sqlite`** - SQLite database (auto-created)

## 🚀 Quick Start

### Start the API Server

```bash
node backend/index.js
```

The server will start on port 3000 (configurable via `.env`).

**Expected Output:**
```
📦 Database connected: /Users/Test/StickerPay/backend/data.sqlite
Initializing database tables...
✓ Database tables ready

═══════════════════════════════════════════════════════════════
🚀 StickerPay API Server Started
═══════════════════════════════════════════════════════════════
📍 Server running at: http://localhost:3000
🌐 CORS enabled for: http://localhost:5173
...
```

## 📡 API Endpoints

### Health Check

```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-18T14:17:23.177Z",
  "service": "StickerPay API",
  "version": "1.0.0"
}
```

### Create User

```bash
POST /api/createUser
Content-Type: application/json

{
  "userId": "user123",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "user123",
    "name": "John Doe",
    "balance": 0,
    "createdAt": "2025-10-18 14:17:23"
  }
}
```

### Get User Balance

```bash
GET /api/balance/:userId
```

**Example:**
```bash
curl http://localhost:3000/api/balance/testuser1
```

**Response (200):**
```json
{
  "userId": "testuser1",
  "balance": 100000,
  "balanceAlgos": "0.100000",
  "updatedAt": "2025-10-18 14:17:23"
}
```

### Get All Users

```bash
GET /api/users
```

**Response (200):**
```json
{
  "count": 2,
  "users": [
    {
      "id": "user1",
      "name": "Alice",
      "balance": 100000,
      "createdAt": "2025-10-18 14:00:00"
    },
    {
      "id": "user2",
      "name": "Bob",
      "balance": 250000,
      "createdAt": "2025-10-18 14:05:00"
    }
  ]
}
```

### Get User Details

```bash
GET /api/user/:userId
```

**Response (200):**
```json
{
  "user": {
    "id": "testuser1",
    "name": "Test User",
    "createdAt": "2025-10-18 14:17:23"
  },
  "balance": {
    "microAlgos": 100000,
    "algos": "0.100000",
    "updatedAt": "2025-10-18 14:17:23"
  }
}
```

### Get Transaction History

```bash
GET /api/transactions/:userId?limit=50
```

**Response (200):**
```json
{
  "userId": "testuser1",
  "count": 2,
  "transactions": [
    {
      "id": 1,
      "userId": "testuser1",
      "type": "deposit",
      "amount": 100000,
      "txid": "ABC123...",
      "status": "confirmed",
      "created_at": "2025-10-18 14:17:23"
    }
  ]
}
```

## 🗄️ Database Schema

### `users` Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

### `balances` Table
```sql
CREATE TABLE balances (
  userId TEXT PRIMARY KEY,
  balance INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
)
```

### `deposits` Table
```sql
CREATE TABLE deposits (
  txid TEXT PRIMARY KEY,
  userId TEXT,
  amount INTEGER,
  sender TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
)
```

### `transactions` Table
```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT,
  type TEXT,
  amount INTEGER,
  txid TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
)
```

## 🔧 Database Helper Functions (db.js)

### User Functions

```javascript
const db = require('./db');

// Get user by ID
const user = db.getUser('user123');
// Returns: { id, name, created_at } or null

// Create new user
const newUser = db.createUser('user123', 'John Doe');
// Returns: { id, name, created_at }

// Get all users
const users = db.getAllUsers();
// Returns: Array of user objects
```

### Balance Functions

```javascript
// Get user balance (in microAlgos)
const balance = db.getBalance('user123');
// Returns: 100000 (integer)

// Credit balance
const newBalance = db.creditBalance('user123', 50000);
// Returns: 150000 (new balance)

// Debit balance
const newBalance = db.debitBalance('user123', 25000);
// Returns: 125000 (new balance)

// Get balance with details
const balanceInfo = db.getBalanceDetails('user123');
// Returns: { userId, balance, updated_at }
```

### Transaction Functions

```javascript
// Record a transaction
const txId = db.recordTransaction(
  'user123',        // userId
  'deposit',        // type
  100000,           // amount
  'ALGO_TX_ID',     // blockchain txid (optional)
  'confirmed'       // status (optional)
);

// Get transaction history
const history = db.getTransactionHistory('user123', 50);
// Returns: Array of up to 50 transactions
```

## 🧪 Testing

### Run API Tests

```bash
node scripts/testBackendAPI.js
```

This will test all endpoints and display results.

### Manual Testing with curl

```bash
# Health check
curl http://localhost:3000/health

# Create user
curl -X POST http://localhost:3000/api/createUser \
  -H "Content-Type: application/json" \
  -d '{"userId":"alice","name":"Alice Smith"}'

# Get balance
curl http://localhost:3000/api/balance/alice

# Get all users
curl http://localhost:3000/api/users

# Get user details
curl http://localhost:3000/api/user/alice

# Get transactions
curl http://localhost:3000/api/transactions/alice
```

## ⚙️ Configuration

Environment variables in `.env`:

```env
# Backend Server
PORT=3000

# Frontend (for CORS)
FRONTEND_URL=http://localhost:5173
```

## 🔄 Integration with depositWatcher

The `depositWatcher.js` script monitors the Algorand blockchain and automatically:
1. Detects incoming transactions with `DEPOSIT:<userId>` notes
2. Creates deposits in the `deposits` table
3. Credits user balances

**To run both services:**

Terminal 1 (API Server):
```bash
node backend/index.js
```

Terminal 2 (Deposit Watcher):
```bash
node backend/depositWatcher.js
```

## 📊 Database Queries

Direct database access using better-sqlite3:

```javascript
const { db } = require('./db');

// Custom query
const result = db.prepare('SELECT * FROM users WHERE name LIKE ?').all('%Alice%');

// Get deposits for a user
const deposits = db.prepare(`
  SELECT * FROM deposits 
  WHERE userId = ? 
  ORDER BY created_at DESC
`).all('user123');
```

## 🛡️ Error Handling

All endpoints return appropriate HTTP status codes:

- **200** - Success
- **201** - Created (user created successfully)
- **400** - Bad Request (missing required fields)
- **404** - Not Found (user doesn't exist)
- **409** - Conflict (user already exists)
- **500** - Internal Server Error

Error responses include:
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

## 🚀 Production Considerations

For production deployment:

1. **Environment Variables**: Use production values in `.env`
2. **Database Backups**: Regular backups of `data.sqlite`
3. **Process Manager**: Use PM2 or similar to keep server running
4. **HTTPS**: Add SSL/TLS termination (nginx/Caddy)
5. **Rate Limiting**: Add rate limiting middleware
6. **Authentication**: Add JWT or session-based auth
7. **Logging**: Implement structured logging (Winston/Pino)
8. **Monitoring**: Add health checks and metrics

## 📝 Notes

- Balances are stored in **microAlgos** (1 ALGO = 1,000,000 microAlgos)
- Database uses **WAL mode** for better concurrent access
- All timestamps are in **ISO 8601 format**
- CORS is enabled for the frontend URL specified in `.env`

