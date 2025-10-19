# Marketplace Smart Contract

PyTeal-based stateful smart contract for managing marketplace listings on Algorand.

## 📋 Overview

The marketplace contract implements a simple listing system with the following lifecycle:
1. **Create** - Seller creates a listing with price and deadline
2. **Lock** - Buyer locks payment for the listing
3. **Finalize** - Admin finalizes the transaction
4. **Refund** - Buyer can refund if deadline passes

## 🏗️ Contract Structure

### Global State

| Key | Type | Description |
|-----|------|-------------|
| `Admin` | address | Administrator address (set on creation) |
| `{listingID}_price` | uint64 | Listing price in microAlgos |
| `{listingID}_seller` | address | Seller address |
| `{listingID}_deadline` | uint64 | Deadline timestamp |
| `{listingID}_status` | bytes | Status: "listed", "locked", "finalized", "refunded" |
| `{listingID}_buyer` | address | Buyer address (set on lock) |

### Local State (per user)

| Key | Type | Description |
|-----|------|-------------|
| `listing_{listingID}` | bytes | Active listing ID |
| `buyer_locked` | uint64 | Whether buyer has locked payment (0 or 1) |

### Methods

#### 1. `create` - Create Listing
**Args:**
- `[0]` = "create"
- `[1]` = listingID (bytes)
- `[2]` = price (uint64, encoded as bytes)
- `[3]` = sellerAddr (address bytes)
- `[4]` = deadline_ts (uint64, encoded as bytes)

**Constraints:**
- Listing must not already exist
- Price must be > 0
- Deadline must be in the future

**Example:**
```javascript
const args = [
  new Uint8Array(Buffer.from('create')),
  new Uint8Array(Buffer.from('listing123')),
  algosdk.encodeUint64(100000), // 0.1 ALGO
  algosdk.decodeAddress(sellerAddr).publicKey,
  algosdk.encodeUint64(Math.floor(Date.now() / 1000) + 86400) // 24h from now
];
```

#### 2. `lock` - Lock Payment
**Args:**
- `[0]` = "lock"
- `[1]` = listingID (bytes)

**Constraints:**
- Listing must exist and be in "listed" status
- Deadline hasn't passed
- Sender cannot be the seller
- Buyer must opt-in to the contract first

**Example:**
```javascript
const args = [
  new Uint8Array(Buffer.from('lock')),
  new Uint8Array(Buffer.from('listing123'))
];
```

#### 3. `finalize` - Finalize Transaction
**Args:**
- `[0]` = "finalize"
- `[1]` = listingID (bytes)

**Constraints:**
- Only admin can call
- Listing must be in "locked" status

**Example:**
```javascript
const args = [
  new Uint8Array(Buffer.from('finalize')),
  new Uint8Array(Buffer.from('listing123'))
];
```

#### 4. `refund` - Refund After Deadline
**Args:**
- `[0]` = "refund"
- `[1]` = listingID (bytes)

**Constraints:**
- Listing must be in "locked" status
- Sender must be the buyer
- Deadline must have passed

**Example:**
```javascript
const args = [
  new Uint8Array(Buffer.from('refund')),
  new Uint8Array(Buffer.from('listing123'))
];
```

## 🔧 Compilation

### Compile to TEAL

```bash
# Activate Python virtual environment
source venv/bin/activate

# Compile approval program
python3 contracts/marketplace.py > contracts/marketplace_approval.teal

# Compile clear state program
python3 contracts/marketplace.py clear > contracts/marketplace_clear.teal
```

### Verify Compilation

```bash
# Check approval program
cat contracts/marketplace_approval.teal | head -20

# Check clear state program
cat contracts/marketplace_clear.teal
```

**Expected output for clear state:**
```teal
#pragma version 8
int 1
return
```

## 🚀 Deployment

### Option 1: Using Node.js Deployment Script

```bash
# Deploy to TestNet
node scripts/deployMarketplace.js
```

The script will:
1. Load creator account from `.env`
2. Compile TEAL programs
3. Create the application
4. Return the Application ID

### Option 2: Using goal CLI

```bash
goal app create \
  --creator YOUR_ADDRESS \
  --approval-prog contracts/marketplace_approval.teal \
  --clear-prog contracts/marketplace_clear.teal \
  --global-byteslices 10 \
  --global-ints 10 \
  --local-byteslices 5 \
  --local-ints 5 \
  --on-completion NoOp
```

### Option 3: Using Python SDK

```python
from algosdk import transaction, account, mnemonic
from algosdk.v2client import algod

# Connect to node
algod_client = algod.AlgodClient(token, server)

# Load programs
with open('contracts/marketplace_approval.teal', 'r') as f:
    approval_program = f.read()
with open('contracts/marketplace_clear.teal', 'r') as f:
    clear_program = f.read()

# Compile
approval_result = algod_client.compile(approval_program)
clear_result = algod_client.compile(clear_program)

# Create transaction
creator = mnemonic.to_private_key(creator_mnemonic)
params = algod_client.suggested_params()

txn = transaction.ApplicationCreateTxn(
    sender=creator_address,
    sp=params,
    on_complete=transaction.OnComplete.NoOpOC,
    approval_program=base64.b64decode(approval_result['result']),
    clear_program=base64.b64decode(clear_result['result']),
    global_schema=transaction.StateSchema(10, 10),
    local_schema=transaction.StateSchema(5, 5)
)

# Sign and send
signed = txn.sign(creator)
tx_id = algod_client.send_transaction(signed)

# Wait for confirmation
result = transaction.wait_for_confirmation(algod_client, tx_id, 4)
app_id = result['application-index']
print(f"Application ID: {app_id}")
```

## 🧪 Testing

### 1. Create a Listing

```javascript
const algosdk = require('algosdk');

// Application call transaction
const appArgs = [
  new Uint8Array(Buffer.from('create')),
  new Uint8Array(Buffer.from('listing001')),
  algosdk.encodeUint64(100000), // 0.1 ALGO
  algosdk.decodeAddress(sellerAddress).publicKey,
  algosdk.encodeUint64(Math.floor(Date.now() / 1000) + 86400)
];

const txn = algosdk.makeApplicationNoOpTxnFromObject({
  from: sellerAddress,
  appIndex: appId,
  appArgs: appArgs,
  suggestedParams: params
});
```

### 2. Buyer Opt-In

Before locking, buyers must opt-in to the contract:

```javascript
const optInTxn = algosdk.makeApplicationOptInTxnFromObject({
  from: buyerAddress,
  appIndex: appId,
  suggestedParams: params
});
```

### 3. Lock Listing

```javascript
const appArgs = [
  new Uint8Array(Buffer.from('lock')),
  new Uint8Array(Buffer.from('listing001'))
];

const txn = algosdk.makeApplicationNoOpTxnFromObject({
  from: buyerAddress,
  appIndex: appId,
  appArgs: appArgs,
  suggestedParams: params
});
```

### 4. Finalize (Admin)

```javascript
const appArgs = [
  new Uint8Array(Buffer.from('finalize')),
  new Uint8Array(Buffer.from('listing001'))
];

const txn = algosdk.makeApplicationNoOpTxnFromObject({
  from: adminAddress,
  appIndex: appId,
  appArgs: appArgs,
  suggestedParams: params
});
```

### 5. Refund (After Deadline)

```javascript
const appArgs = [
  new Uint8Array(Buffer.from('refund')),
  new Uint8Array(Buffer.from('listing001'))
];

const txn = algosdk.makeApplicationNoOpTxnFromObject({
  from: buyerAddress,
  appIndex: appId,
  appArgs: appArgs,
  suggestedParams: params
});
```

## 📊 Reading Contract State

### Get Global State

```javascript
const appInfo = await algodClient.getApplicationByID(appId).do();
const globalState = appInfo.params['global-state'];

// Decode state values
globalState.forEach(item => {
  const key = Buffer.from(item.key, 'base64').toString();
  let value;
  if (item.value.type === 1) { // bytes
    value = Buffer.from(item.value.bytes, 'base64').toString();
  } else { // uint
    value = item.value.uint;
  }
  console.log(`${key}: ${value}`);
});
```

### Get Local State

```javascript
const accountInfo = await algodClient.accountApplicationInformation(
  userAddress, 
  appId
).do();
const localState = accountInfo['app-local-state']['key-value'];

localState.forEach(item => {
  const key = Buffer.from(item.key, 'base64').toString();
  let value;
  if (item.value.type === 1) {
    value = Buffer.from(item.value.bytes, 'base64').toString();
  } else {
    value = item.value.uint;
  }
  console.log(`${key}: ${value}`);
});
```

## 🔐 Security Considerations

1. **Admin Controls**: Only admin can finalize transactions
2. **Deadline Enforcement**: Refunds only allowed after deadline
3. **Status Checks**: Each method validates listing status
4. **Seller Protection**: Buyers cannot be sellers
5. **Idempotency**: Listings cannot be duplicated

## 📝 State Requirements

When deploying, ensure sufficient state allocation:

- **Global State**: 10 ints, 10 byte slices
- **Local State**: 5 ints, 5 byte slices per user

Each listing uses 5 global state entries:
- `{listingID}_price` (int)
- `{listingID}_seller` (bytes)
- `{listingID}_deadline` (int)
- `{listingID}_status` (bytes)
- `{listingID}_buyer` (bytes)

## 🌐 Explorer Links

After deployment, view your contract on:
- **TestNet**: `https://testnet.algoexplorer.io/application/{APP_ID}`
- **MainNet**: `https://algoexplorer.io/application/{APP_ID}`

## 🛠️ Development Notes

- Contract uses **PyTeal version 0.27.0**
- Compiled for **TEAL version 8**
- Minimum balance increase per listing: ~0.1 ALGO
- Users must opt-in before participating as buyers

## 📚 Additional Resources

- [PyTeal Documentation](https://pyteal.readthedocs.io/)
- [Algorand Smart Contracts Guide](https://developer.algorand.org/docs/get-details/dapps/smart-contracts/)
- [TEAL Reference](https://developer.algorand.org/docs/get-details/dapps/avm/teal/)

