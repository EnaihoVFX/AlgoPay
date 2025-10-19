# commitPayment.js - Payment Commitment Module

Handles payment commitment for marketplace listings with atomic Algorand transactions.

---

## 📋 Overview

The `commitPayment` function creates an atomic transaction group that:
1. Sends payment from pooled account to escrow
2. Calls marketplace contract to lock the listing
3. Updates database with transaction status

All operations are atomic - either everything succeeds or everything is rolled back.

---

## 🔧 Configuration

Add to `.env`:
```env
# Algorand Connection
ALGOD_URL=https://testnet-api.algonode.cloud
ALGOD_TOKEN=

# Pooled Account (hot wallet)
POOLED_MNEMONIC="your 25 word mnemonic here"
POOLED_ADDRESS="YOUR_POOLED_ACCOUNT_ADDRESS"

# Marketplace Contract
MARKETPLACE_APP_ID=123456
```

---

## 📦 Function Signature

```javascript
async function commitPayment({
  userId,        // string - User ID from database
  listingID,     // string - Listing identifier
  amount,        // number - Amount in microAlgos
  sellerAddress, // string - Seller's Algorand address
  escrowAddress  // string - Escrow LogicSig address
})
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID from database |
| `listingID` | string | Unique listing identifier |
| `amount` | number | Payment amount in microAlgos |
| `sellerAddress` | string | Seller's Algorand address |
| `escrowAddress` | string | Escrow LogicSig address (compiled for this listing) |

### Returns

**Success:**
```javascript
{
  ok: true,
  txid: "TRANSACTION_ID",
  round: 12345678,
  amount: 100000,
  listingID: "listing123",
  userId: "user123"
}
```

**Failure:**
```javascript
{
  ok: false,
  error: "Error message",
  userId: "user123",
  listingID: "listing123",
  amount: 100000
}
```

---

## 🔄 Process Flow

### Step 1: Validation
- Validates all input parameters
- Checks user exists in database
- Verifies sufficient balance
- Validates Algorand addresses

### Step 2: Reserve Funds
```javascript
// Database operation
// available_balance -= amount
// reserved_balance += amount
```

### Step 3: Build Transaction Group
```javascript
// Transaction 1: Payment
from: POOLED_ADDRESS
to: ESCROW_ADDRESS
amount: amount microAlgos

// Transaction 2: ApplicationCall
app: MARKETPLACE_APP_ID
method: "lock"
args: [listingID]
accounts: [sellerAddress, escrowAddress]
```

### Step 4: Sign & Send
- Both transactions signed with pooled account private key
- Sent as atomic group
- Both succeed or both fail

### Step 5: Confirm
- Wait for blockchain confirmation
- Timeout after 4 rounds (~16 seconds)

### Step 6: Database Update
**On Success:**
- Record transaction with blockchain txid
- Move amount from reserved to spent
- Status: "confirmed"

**On Failure:**
- Rollback reservation
- Move amount back to available
- Log error

---

## 🌐 Express API Endpoint

### POST /api/pay

**Request:**
```json
{
  "userId": "user123",
  "listingID": "listing001",
  "amount": 100000,
  "sellerAddress": "SELLER_ALGO_ADDRESS",
  "escrowAddress": "ESCROW_ALGO_ADDRESS"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "txid": "ABC123...",
  "round": 12345678,
  "amount": 100000,
  "listingID": "listing001",
  "userId": "user123",
  "explorer": "https://testnet.algoexplorer.io/tx/ABC123..."
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "error": "Insufficient balance",
  "userId": "user123",
  "listingID": "listing001"
}
```

---

## 💻 Usage Examples

### Using Express API

```bash
curl -X POST http://localhost:3000/api/pay \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "testuser1",
    "listingID": "listing123",
    "amount": 100000,
    "sellerAddress": "SELLER_ADDRESS",
    "escrowAddress": "ESCROW_ADDRESS"
  }'
```

### Direct Function Call

```javascript
const { commitPayment } = require('./backend/commitPayment');

const result = await commitPayment({
  userId: 'user123',
  listingID: 'listing001',
  amount: 100000,
  sellerAddress: 'SELLER_ALGORAND_ADDRESS',
  escrowAddress: 'ESCROW_ALGORAND_ADDRESS'
});

if (result.ok) {
  console.log('Payment committed:', result.txid);
} else {
  console.error('Payment failed:', result.error);
}
```

### Frontend JavaScript

```javascript
async function commitPayment(userId, listingID, amount, seller, escrow) {
  const response = await fetch('http://localhost:3000/api/pay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      listingID,
      amount,
      sellerAddress: seller,
      escrowAddress: escrow
    })
  });
  
  const data = await response.json();
  return data;
}

// Usage
const result = await commitPayment(
  'user123',
  'listing001',
  100000,
  'SELLER_ADDR',
  'ESCROW_ADDR'
);

if (result.success) {
  console.log('View transaction:', result.explorer);
}
```

---

## 🛡️ Error Handling

### Database Errors

**Insufficient Balance:**
```javascript
{
  ok: false,
  error: "Insufficient funds: have 50000 microAlgos, need 100000 microAlgos"
}
```

**User Not Found:**
```javascript
{
  error: "User not found",
  userId: "nonexistent"
}
```

### Blockchain Errors

**Network Error:**
```javascript
{
  ok: false,
  error: "Network request error. Received status 400..."
}
```

**Insufficient Algorand Balance:**
```javascript
{
  ok: false,
  error: "account has insufficient balance"
}
```

**Transaction Rejected:**
```javascript
{
  ok: false,
  error: "logic eval error: assert failed"
}
```

### Rollback on Failure

If any step fails after funds are reserved:
1. Database reservation is rolled back
2. Amount returned to available balance
3. Error logged and returned

---

## 🧪 Testing

### Prerequisites

1. **Set up environment:**
   ```bash
   # Add to .env
   MARKETPLACE_APP_ID=your_app_id
   POOLED_MNEMONIC="your 25 word mnemonic"
   POOLED_ADDRESS="your address"
   ```

2. **Fund pooled account:**
   ```bash
   # Send TestNet ALGO to POOLED_ADDRESS
   # Visit: https://bank.testnet.algorand.network/
   ```

3. **Create user with balance:**
   ```bash
   curl -X POST http://localhost:3000/api/createUser \
     -H "Content-Type: application/json" \
     -d '{"userId":"testuser1","name":"Test User"}'
   
   # Credit balance (via depositWatcher or manually in DB)
   ```

4. **Compile escrow:**
   ```bash
   node scripts/compileEscrow.js listing123
   # Note the escrow address
   ```

### Run Test

```bash
# Start server
node backend/index.js

# In another terminal
curl -X POST http://localhost:3000/api/pay \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "testuser1",
    "listingID": "listing123",
    "amount": 100000,
    "sellerAddress": "YOUR_SELLER_ADDRESS",
    "escrowAddress": "YOUR_ESCROW_ADDRESS"
  }'
```

### Expected Output

**Server Console:**
```
📤 Payment request received from testuser1 for listing listing123

╔═══════════════════════════════════════════════════════════════╗
║              COMMIT PAYMENT TO MARKETPLACE                    ║
╚═══════════════════════════════════════════════════════════════╝

1️⃣  Validating inputs...
   ✓ All inputs valid

2️⃣  Reserving funds in database...
   ✓ Reserved 100000 microAlgos

3️⃣  Loading pooled account...
   ✓ Loaded account: POOLED_ADDRESS

4️⃣  Connecting to Algorand node...
   ✓ Connected (round: 12345678)

5️⃣  Building atomic transaction group...
   ✓ Transaction group created

6️⃣  Signing transactions...
   ✓ Both transactions signed

7️⃣  Sending transaction group to network...
   ✓ Submitted with txID: ABC123...

8️⃣  Waiting for confirmation...
   ✓ Confirmed in round 12345679

9️⃣  Updating database...
   ✓ Payment recorded

╔═══════════════════════════════════════════════════════════════╗
║                    ✅ PAYMENT COMMITTED                       ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 📊 Database Schema Updates

### Transactions Table

New entries created:
1. **Reserve transaction:**
   ```sql
   type: 'reserve'
   amount: 100000
   status: 'pending'
   ```

2. **Commit transaction:**
   ```sql
   type: 'payment_committed'
   amount: 100000
   txid: 'BLOCKCHAIN_TXID'
   status: 'confirmed'
   ```

### Balances Table

Balance decremented by amount:
```sql
UPDATE balances 
SET balance = balance - 100000 
WHERE userId = 'user123'
```

---

## 🔒 Security Considerations

1. **Private Key Security:**
   - Pooled account private key stored in `.env`
   - Never expose mnemonic in logs or responses

2. **Balance Checks:**
   - Database balance verified before transaction
   - Prevents overdraft attempts

3. **Atomic Transactions:**
   - Payment and lock happen atomically
   - No partial state possible

4. **Rollback on Failure:**
   - Database reservations rolled back
   - No funds lost on errors

5. **Input Validation:**
   - All inputs sanitized
   - Algorand addresses validated

---

## 📝 Notes

- Amount is in **microAlgos** (1 ALGO = 1,000,000 microAlgos)
- Transactions confirm in ~4-8 seconds typically
- Network fees (~0.001 ALGO) paid by pooled account
- Escrow address must be compiled for specific listingID
- Marketplace app must exist and be deployed

---

## 🚀 Production Checklist

- [ ] Use secure key management (HSM, KMS)
- [ ] Implement rate limiting
- [ ] Add transaction monitoring
- [ ] Set up alerts for failures
- [ ] Implement retry logic for network errors
- [ ] Add detailed audit logging
- [ ] Monitor pooled account balance
- [ ] Implement fee estimation
- [ ] Add transaction status webhooks
- [ ] Set up database backups

---

## 🆘 Troubleshooting

**Problem:** "POOLED_MNEMONIC not configured"
- **Solution:** Add mnemonic to `.env` file

**Problem:** "Insufficient balance"
- **Solution:** Credit user balance or check database

**Problem:** "Network request error"
- **Solution:** Check ALGOD_URL and internet connection

**Problem:** "logic eval error"
- **Solution:** Verify escrow is compiled correctly for listingID

**Problem:** "Transaction rejected"
- **Solution:** Check marketplace contract is deployed and app ID is correct

