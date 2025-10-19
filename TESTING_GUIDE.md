# StickerPay Deposit Watcher - Testing Guide

## 📋 Prerequisites

- Node.js 16+ installed
- TestNet ALGO for testing
- `.env` file configured (already done!)

## ✅ Current Setup Status

Your environment is configured with:
- **Indexer**: AlgoNode TestNet (public, no API key needed)
- **Pooled Address**: `54Z4UQNPKFOL2LB3YTQ23SDNOMPUIUPM3WKDN3AHH2KXUCVN6WXZKYC4EI`
- **Database**: SQLite at `backend/data.sqlite`

## 🧪 Acceptance Test Steps

### Step 1: Fund the Pooled Address

The pooled address needs to receive its first transaction to exist on-chain.

**Option A: Use Web Dispenser (Recommended)**
1. Visit: https://bank.testnet.algorand.network/
2. Enter address: `54Z4UQNPKFOL2LB3YTQ23SDNOMPUIUPM3WKDN3AHH2KXUCVN6WXZKYC4EI`
3. Complete CAPTCHA and click "Dispense"
4. Wait 5 seconds for confirmation

**Option B: Use AlgoExplorer Dispenser**
1. Visit: https://testnet.algoexplorer.io/dispenser
2. Enter the same address
3. Complete CAPTCHA and dispense

### Step 2: Start the Deposit Watcher

```bash
cd /Users/Test/StickerPay
node backend/depositWatcher.js
```

**Expected Output:**
```
Initializing database...
Database initialized at: /Users/Test/StickerPay/backend/data.sqlite
Connecting to Algorand Indexer at testnet-api.algonode.cloud:443
Testing indexer connection...
✓ Indexer connection successful

🔍 Starting deposit watcher for address: 54Z4UQNPKFOL2LB3YTQ23SDNOMPUIUPM3WKDN3AHH2KXUCVN6WXZKYC4EI
⏱️  Polling every 5 seconds
```

✅ **Acceptance Criterion #1**: Script starts without crashing and polls continuously.

### Step 3: Send a Test Deposit Transaction

You have several options to send a deposit:

**Option A: Use Pera Wallet (Mobile)**
1. Switch to TestNet mode in settings
2. Create/import an account with TestNet ALGO
3. Send transaction:
   - **To**: `54Z4UQNPKFOL2LB3YTQ23SDNOMPUIUPM3WKDN3AHH2KXUCVN6WXZKYC4EI`
   - **Amount**: 0.1 ALGO (or any amount)
   - **Note**: `DEPOSIT:testuser1`
4. Confirm and send

**Option B: Use AlgoSigner Browser Extension**
1. Switch to TestNet
2. Create/import account with TestNet ALGO
3. Send transaction with note: `DEPOSIT:testuser1`
4. To address: `54Z4UQNPKFOL2LB3YTQ23SDNOMPUIUPM3WKDN3AHH2KXUCVN6WXZKYC4EI`

**Option C: Use Algorand Web Wallet**
1. Visit: https://testnet.wallet.perawallet.app/
2. Import account or create new one
3. Send transaction with note: `DEPOSIT:testuser1`

**Option D: Use Goal CLI (if installed)**
```bash
goal clerk send \
  --from YOUR_SENDER_ADDRESS \
  --to 54Z4UQNPKFOL2LB3YTQ23SDNOMPUIUPM3WKDN3AHH2KXUCVN6WXZKYC4EI \
  --amount 100000 \
  --note "DEPOSIT:testuser1" \
  --datadir ~/.algorand-testnet
```

### Step 4: Verify Deposit Processing

Watch the depositWatcher console output. Within 5-10 seconds, you should see:

```
✓ Processed deposit txid ABC123XYZ... for user testuser1 amount 100000 microAlgos
```

✅ **Acceptance Criterion #2**: Deposit is detected and logged to console.

### Step 5: Verify Database Updates

Check the database to confirm the deposit was recorded:

```bash
# Check deposits table
sqlite3 backend/data.sqlite "SELECT * FROM deposits;"

# Check balances table
sqlite3 backend/data.sqlite "SELECT * FROM balances;"

# Check users table
sqlite3 backend/data.sqlite "SELECT * FROM users;"
```

**Expected Results:**
- `deposits` table has a row with your transaction ID
- `balances` table shows `testuser1` with amount `100000`
- `users` table has a row for `testuser1`

✅ **Acceptance Criterion #3**: Database tables are updated correctly.

## 🔍 Troubleshooting

### Issue: "fetch failed" error
- **Solution**: Check internet connection, verify INDEXER_URL is correct

### Issue: "Account does not exist" (404)
- **Solution**: The account hasn't been funded yet. Fund it using Step 1.

### Issue: Deposit not detected
- **Solution**: 
  - Verify the note starts with exactly `DEPOSIT:` (case-sensitive)
  - Check that the transaction was sent to the correct address
  - Wait 10-15 seconds for the transaction to confirm
  - Check transaction on explorer: https://testnet.algoexplorer.io/

### Issue: "SQLITE_ERROR: no such table"
- **Solution**: Delete `backend/data.sqlite` and restart the watcher

## 🧪 Testing Tools

### Quick Test (One Iteration)
```bash
node scripts/testDepositWatcher.js
```
Runs one polling cycle and shows results.

### Generate New Account
```bash
node scripts/generateTestAccount.js
```
Creates a new Algorand TestNet account with mnemonic.

## 📊 Success Criteria Summary

✅ **All Three Acceptance Criteria:**
1. ✓ depositWatcher starts and polls without crashing
2. ✓ Console logs show processed deposits
3. ✓ Database tables (deposits, balances, users) are updated correctly

## 🎉 Next Steps

Once the acceptance test passes:
- Build the withdrawal system
- Create the frontend QR code scanner
- Implement PyTeal smart contracts
- Add transaction signing and broadcasting

## 📝 Notes

- This is a **TestNet** setup - never use mainnet mnemonics
- The account mnemonic is in the `.env` file (keep it secure even for testnet)
- Database is local SQLite (not suitable for production without modifications)
- AlgoNode provides free public API access (no key needed)

