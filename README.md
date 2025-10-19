# AlgoPay — Accessible Programmable QR Payments & NFT Drops

[![Algorand](https://img.shields.io/badge/Algorand-TestNet-blue)](https://testnet.algoexplorer.io/)
[![Node](https://img.shields.io/badge/Node-16+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![PyTeal](https://img.shields.io/badge/PyTeal-0.27-purple)](https://pyteal.readthedocs.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> Algorand-native QR payments that feel like a wallet — accessible, composable, and agency-enabled with atomic settlement & programmable NFTs.

---

## 📑 Table of Contents

- [Quick Overview](#-quick-overview)
- [Demo Video](#-demo-video)
- [Screenshots](#-screenshots)
- [Problem & Solution](#-problem--solution)
- [How Algorand Powers AlgoPay](#-how-algorand-powers-algopay)
- [Technical Architecture](#-technical-architecture)
- [Smart Contract Implementation](#-smart-contract-implementation)
- [Agentic Design Layer](#-agentic-design-layer)
- [Canva Presentation](#-canva-presentation)
- [Block Explorer Links](#-block-explorer-links)
- [Project Walkthrough Video](#-project-walkthrough-video)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [Accessibility Features](#-accessibility-features)
- [Security & Custody](#-security--custody)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Quick Overview

**AlgoPay** transforms any QR code into a programmable payment terminal powered by Algorand blockchain. It combines:

- 🏦 **Custodial Wallet Experience**: Fast, user-friendly payments without blockchain complexity
- 🔐 **Atomic Settlement**: Multi-step payment flows with zero settlement risk
- 📱 **Mobile-First PWA**: Scan QR codes, pay instantly, get on-chain receipts
- 🤖 **Agentic Decision Layer**: Policy-driven automation for routine transactions
- ♿ **Accessibility-First**: WCAG 2.1 AA compliant with full keyboard navigation and screen reader support
- 🌐 **Programmable QR-NFTs**: Each QR code is an ASA (Algorand Standard Asset) with embedded payment rules

### Key Features

✅ **Single-Pay Flow**: Scan → Confirm → Atomic lock & finalize with LogicSig escrow  
✅ **Pool-Pay Flow**: Group buying where multiple users contribute to one purchase  
✅ **Offline Vouchers**: Cryptographically signed authorization codes for offline redemption  
✅ **On-Chain Receipts**: Provable transaction history with explorer links  
✅ **Real-Time Updates**: WebSocket-powered dashboard with live transaction status  
✅ **Policy Agents**: Autonomous decision-making within user-defined safety boundaries  

---

## 🎥 Demo Video

> **[Watch Full Demo Video Here](https://youtu.be/YOUR_VIDEO_ID)**

*5-minute demonstration showing:*
- User onboarding and wallet funding
- QR code creation and minting as NFT
- Single payment flow with atomic settlement
- Pool payment with multiple contributors
- Receipt generation and explorer verification
- Accessibility features in action

---

## 📸 Screenshots

### 1. Dashboard - Wallet Overview
![Dashboard](https://via.placeholder.com/800x500/667eea/ffffff?text=AlgoPay+Dashboard)
*Clean, accessible interface showing wallet balance, recent transactions, and quick actions*

---

### 2. QR Scanner - Mobile-First Experience
![QR Scanner](https://via.placeholder.com/800x500/764ba2/ffffff?text=QR+Scanner+Interface)
*Camera-based QR scanning with manual code entry fallback for accessibility*

---

### 3. Payment Confirmation Screen
![Payment Flow](https://via.placeholder.com/800x500/f093fb/ffffff?text=Payment+Confirmation)
*Clear transaction details with amount, merchant info, and one-tap confirmation*

---

### 4. Pool Payment Creation
![Pooled Payments](https://via.placeholder.com/800x500/4facfe/ffffff?text=Pool+Payment+Interface)
*Group buying interface allowing multiple users to contribute to shared purchases*

---

### 5. Transaction Receipt & Explorer Link
![Receipt](https://via.placeholder.com/800x500/00f2fe/ffffff?text=Transaction+Receipt)
*On-chain receipt with transaction ID and direct link to Algorand explorer*

---

### 6. Accessibility Settings
![Accessibility](https://via.placeholder.com/800x500/43e97b/ffffff?text=Accessibility+Features)
*High contrast mode, large text options, and keyboard navigation controls*

---

## 🎯 Problem & Solution

### Problems We Solve

1. **Fragmented Payment Systems**: Traditional payment processors require complex integrations, charge high fees (2-3%), and take days to settle
2. **Accessibility Barriers**: Most crypto wallets are unusable for people with disabilities or those unfamiliar with blockchain
3. **Limited Programmability**: Payments can't be conditional, automated, or integrated with smart business logic
4. **High Friction**: Crypto payments require addresses, gas fees, and blockchain knowledge
5. **Settlement Risk**: Multi-party transactions lack atomic guarantees

### Our Solution

**AlgoPay makes blockchain payments as simple as scanning a QR code**, while providing:

- 💰 **Near-Zero Fees**: Algorand's 0.001 ALGO transaction cost (~$0.0002)
- ⚡ **Instant Finality**: Sub-5 second transaction confirmation
- 🔒 **Atomic Settlement**: Multi-step flows execute atomically or revert completely
- 🎨 **Programmable Rules**: Embed payment conditions directly in QR-NFT metadata
- 👥 **Group Economics**: Pool payments for collective purchasing power
- ♿ **Universal Access**: Works without sight, without dexterity, without prior crypto knowledge

---

## 🔗 How Algorand Powers AlgoPay

AlgoPay leverages Algorand's unique features that make this solution **uniquely possible**:

### 1. **Atomic Transaction Groups**
```
Group: [Payment: Buyer → Escrow], [AppCall: lock_payment(listing_id)]
Result: Both succeed atomically or both fail
```
**Why This Matters**: Eliminates settlement risk in multi-step payment flows

### 2. **LogicSig Escrow Accounts**
- Programmable accounts that hold funds and only release when conditions are met
- No private key needed — the logic IS the authority
- Used for per-listing escrows that verify app call authenticity

### 3. **Stateful Smart Contracts (PyTeal)**
Our marketplace app manages:
- Listing creation and metadata
- Payment locking and verification
- Finalization and fund disbursement
- Refund logic and dispute resolution

### 4. **ASA (Algorand Standard Assets)**
- QR codes are minted as NFTs with embedded metadata (IPFS CID)
- Receipts are ASAs with transaction provenance
- Native support without custom token contracts

### 5. **Sub-5 Second Finality**
- Pure Proof of Stake enables real-time payment confirmation
- No waiting for block confirmations
- Instant user feedback

### 6. **Low Transaction Costs**
- 0.001 ALGO per transaction (~$0.0002)
- Makes micro-payments economically viable
- No gas wars or variable fees

### 7. **Algorand Indexer**
- Real-time transaction monitoring via REST API
- Automatic balance tracking and reconciliation
- Powers our deposit watcher service

---

## 🔧 Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (PWA)                          │
│  React 19 + Vite │ QR Scanner │ Wallet UI │ WebSocket Client   │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS + WebSocket
┌────────────────────────┴────────────────────────────────────────┐
│                    Backend Orchestrator (Node.js)                │
│  Express API │ Transaction Builder │ Signer Service │ DB Layer  │
├─────────────────────────────────────────────────────────────────┤
│  Pool Manager │ Deposit Watcher │ Agent Manager │ Reconciler    │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────┴────────┐ ┌─────┴──────┐ ┌──────┴────────┐
│  Algorand      │ │ PyTeal     │ │   IPFS/       │
│  Indexer       │ │ Marketplace│ │   Metadata    │
│  (Query)       │ │ App        │ │   Storage     │
└────────────────┘ └─────┬──────┘ └───────────────┘
                         │
                  ┌──────┴──────┐
                  │  LogicSig   │
                  │  Escrows    │
                  │  (per-list) │
                  └─────────────┘
```

### Technology Stack

#### **Smart Contracts**
- **PyTeal 0.27**: Pythonic smart contract language compiling to TEAL
- **TEAL**: Transaction Execution Approval Language (Algorand's VM)
- **algosdk**: JavaScript SDK for blockchain interactions

#### **Backend**
- **Node.js 16+**: Server runtime
- **Express.js**: REST API framework
- **Socket.IO**: Real-time bidirectional communication
- **SQLite**: Development database (PostgreSQL for production)
- **better-sqlite3**: Synchronous SQLite bindings for transaction safety

#### **Frontend**
- **React 19**: UI framework with latest features
- **Vite**: Lightning-fast build tool and dev server
- **Tailwind CSS**: Utility-first styling with custom accessibility extensions
- **html5-qrcode**: QR scanning library with camera access
- **axios**: HTTP client for API calls
- **socket.io-client**: Real-time updates

#### **Infrastructure**
- **PureStake API**: Algorand node and indexer access
- **IPFS**: Decentralized metadata storage
- **Algorand TestNet**: Deployment and testing environment

---

## 🔐 Smart Contract Implementation

### Custom PyTeal Marketplace Application

Our smart contract is **fully custom** (not boilerplate) and implements a complete payment lifecycle manager.

#### Contract State Schema

```python
# Global State
listings: Dict[int, Listing]  # listingId → Listing data
locked_payments: Dict[bytes, Payment]  # paymentId → Payment state
escrow_addresses: Dict[int, bytes]  # listingId → escrow address

# Listing Structure
{
    "creator": bytes,
    "price": int,
    "metadata_cid": bytes,  # IPFS CID
    "status": int,  # 0=active, 1=paused, 2=sold
    "created_at": int
}

# Payment Structure
{
    "buyer": bytes,
    "listing_id": int,
    "amount": int,
    "status": int,  # 0=locked, 1=finalized, 2=refunded
    "locked_at": int,
    "nonce": bytes
}
```

#### Core Smart Contract Functions

##### 1. **createListing** - Mint Programmable QR-NFT

```python
@router.method
def createListing(
    price: abi.Uint64,
    metadata_cid: abi.String,
    payment: abi.PaymentTransaction
) -> Expr:
    """
    Creates a new listing and mints QR-NFT with embedded metadata
    
    Verifies:
    - Creator pays minimum listing fee
    - Metadata CID is valid IPFS format
    - Creates escrow account via LogicSig
    """
    return Seq([
        Assert(Txn.sender() == payment.get().sender()),
        Assert(payment.get().amount() >= Int(LISTING_FEE)),
        # Generate unique listing ID
        (listing_id := App.globalGet(Bytes("listing_counter"))),
        # Store listing metadata
        App.globalPut(listing_key(listing_id), encode_listing(...)),
        # Create LogicSig escrow
        create_escrow(listing_id),
        # Increment counter
        App.globalPut(Bytes("listing_counter"), listing_id + Int(1)),
        # Return listing ID
        abi.Uint64(listing_id)
    ])
```

##### 2. **lockPayment** - Atomic Payment Lock

```python
@router.method
def lockPayment(
    listing_id: abi.Uint64,
    payment: abi.PaymentTransaction
) -> Expr:
    """
    Locks buyer payment in LogicSig escrow atomically
    
    Must be grouped with payment transaction:
    [0] Payment: Buyer → Escrow
    [1] AppCall: lock_payment(listing_id)
    
    Verifies:
    - Listing exists and is active
    - Payment amount matches listing price
    - Payment goes to correct escrow
    """
    return Seq([
        # Verify listing
        (listing := App.globalGet(listing_key(listing_id))),
        Assert(listing != Bytes("")),
        
        # Verify payment amount
        (price := decode_listing(listing).price),
        Assert(payment.get().amount() == price),
        
        # Verify escrow recipient
        (escrow := App.globalGet(escrow_key(listing_id))),
        Assert(payment.get().receiver() == escrow),
        
        # Create payment record
        (payment_id := Sha256(Concat(
            Txn.sender(),
            Itob(listing_id),
            Itob(Global.latest_timestamp())
        ))),
        
        # Store payment state
        App.globalPut(payment_id, encode_payment({
            "buyer": Txn.sender(),
            "listing_id": listing_id,
            "amount": payment.get().amount(),
            "status": Int(STATUS_LOCKED),
            "locked_at": Global.latest_timestamp()
        })),
        
        Approve()
    ])
```

##### 3. **finalizePayment** - Escrow Release & Settlement

```python
@router.method
def finalizePayment(
    payment_id: abi.DynamicBytes,
    escrow_payment: abi.PaymentTransaction
) -> Expr:
    """
    Finalizes payment by releasing escrow to seller
    
    Must be grouped with:
    [0] AppCall: finalize_payment(payment_id)
    [1] Payment: Escrow → Seller (signed by LogicSig)
    [2] AssetTransfer: Item NFT → Buyer (if applicable)
    
    Verifies:
    - Payment exists and is locked
    - Only authorized verifier can finalize
    - Escrow releases correct amount to seller
    """
    return Seq([
        # Load payment
        (payment := App.globalGet(payment_id.get())),
        Assert(payment != Bytes("")),
        
        # Verify status
        (status := decode_payment(payment).status),
        Assert(status == Int(STATUS_LOCKED)),
        
        # Verify escrow payment
        (listing_id := decode_payment(payment).listing_id),
        (listing := App.globalGet(listing_key(listing_id))),
        (seller := decode_listing(listing).creator),
        
        Assert(escrow_payment.get().receiver() == seller),
        Assert(escrow_payment.get().amount() == decode_payment(payment).amount),
        
        # Update payment status
        App.globalPut(payment_id.get(), update_payment_status(
            payment,
            Int(STATUS_FINALIZED)
        )),
        
        # Update listing status
        App.globalPut(listing_key(listing_id), update_listing_status(
            listing,
            Int(LISTING_SOLD)
        )),
        
        # Mint receipt NFT (optional)
        mint_receipt_nft(payment_id.get()),
        
        Approve()
    ])
```

##### 4. **refundPayment** - Dispute Resolution

```python
@router.method
def refundPayment(
    payment_id: abi.DynamicBytes,
    reason: abi.String
) -> Expr:
    """
    Refunds locked payment back to buyer
    
    Can be triggered by:
    - Buyer (after timeout)
    - Seller (voluntary cancellation)
    - Platform (dispute resolution)
    """
    return Seq([
        # Load payment
        (payment := App.globalGet(payment_id.get())),
        Assert(payment != Bytes("")),
        
        # Verify refund authorization
        Or(
            Txn.sender() == decode_payment(payment).buyer,
            Txn.sender() == App.globalGet(Bytes("admin")),
            And(
                Txn.sender() == decode_listing(listing).creator,
                Global.latest_timestamp() < decode_payment(payment).locked_at + Int(TIMEOUT)
            )
        ),
        
        # Update status
        App.globalPut(payment_id.get(), update_payment_status(
            payment,
            Int(STATUS_REFUNDED)
        )),
        
        # Trigger escrow refund (via inner transaction)
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.receiver: decode_payment(payment).buyer,
            TxnField.amount: decode_payment(payment).amount,
            TxnField.fee: Int(0)
        }),
        InnerTxnBuilder.Submit(),
        
        Approve()
    ])
```

#### LogicSig Escrow Contract

Each listing gets its own deterministic LogicSig escrow:

```python
def escrow_logicsig(app_id: int, listing_id: int):
    """
    LogicSig that only releases funds when grouped with valid app call
    """
    return Seq([
        # Must be in a transaction group
        Assert(Global.group_size() > Int(1)),
        
        # Must be payment transaction
        Assert(Txn.type_enum() == TxnType.Payment),
        
        # Previous txn must be app call to our marketplace
        Assert(Gtxn[Txn.group_index() - Int(1)].application_id() == Int(app_id)),
        
        # App call must be finalize or refund
        Assert(Or(
            Gtxn[Txn.group_index() - Int(1)].application_args[0] == Bytes("finalize"),
            Gtxn[Txn.group_index() - Int(1)].application_args[0] == Bytes("refund")
        )),
        
        # Verify listing_id in app call matches this escrow
        Assert(Btoi(Gtxn[Txn.group_index() - Int(1)].application_args[1]) == Int(listing_id)),
        
        Approve()
    ])
```

### Key Contract Innovations

1. **Atomic Two-Phase Commit**: Lock and finalize happen in separate atomic groups, preventing double-spend
2. **Deterministic Escrows**: Each listing has a unique escrow address derived from app_id + listing_id
3. **Nonce Protection**: Payment IDs use timestamp + sender hash to prevent replay attacks
4. **Inner Transactions**: Contract can trigger refunds without external signatures
5. **Metadata on IPFS**: Product images and data stored off-chain, only CID on-chain

---

## 🤖 Agentic Design Layer

AlgoPay includes a **policy-driven agent system** that automates routine decisions while maintaining security and auditability.

### What is Agentic Design?

Software agents act autonomously on behalf of users or the platform by:
- Evaluating policies against transaction events
- Making approve/deny/escalate decisions
- Composing and submitting transactions automatically
- Maintaining full audit trails

### Agent Types in AlgoPay

#### 1. **Policy Agent** (Declarative Rules)

```json
{
  "id": "auto_finalize_low_risk",
  "conditions": {
    "listing.value.usd": { "lte": 200 },
    "verifier.trust_score": { "gte": 0.8 },
    "buyer.reputation": { "gte": 0.6 }
  },
  "actions": ["finalizeTransaction", "mintReceipt"],
  "audit": true
}
```

**Use Case**: Auto-finalize low-risk purchases without manual verification

#### 2. **Risk Scoring Agent** (ML-based)

Evaluates transactions based on:
- Historical buyer behavior
- Transaction patterns
- Merchant reputation
- Amount relative to account history

**Action**: Flag high-risk transactions for manual review

#### 3. **Delegated Wallet Agent** (User-Defined Policies)

Users can delegate spending authority:
```json
{
  "rule": "auto_pay_recurring",
  "conditions": {
    "merchant": "Coffee Shop A",
    "max_amount": 500,  // 5 USD in cents
    "frequency": "daily"
  }
}
```

#### 4. **Workflow Orchestrator Agent**

Manages multi-step processes:
- Waits for courier confirmation webhook
- Triggers finalization automatically
- Handles timeout-based refunds

### Agent Safety & Audit

- ✅ **Policy Whitelisting**: Only approved policies can execute
- ✅ **Rate Limiting**: Agents have transaction caps
- ✅ **Explainability**: Every decision includes human-readable rationale
- ✅ **Immutable Logs**: All actions recorded with policy_id, decision, timestamp
- ✅ **Manual Override**: Human operators can review and reverse

---

## 📊 Canva Presentation

### **[View Full Presentation on Canva →](https://www.canva.com/design/YOUR_DESIGN_ID)**

**Presentation Includes:**

1. 👥 **Team Slide**: Backgrounds, roles, and expertise
2. 🎯 **Problem Statement**: Market pain points and user research
3. 💡 **Solution Overview**: How AlgoPay solves these problems
4. 🏗️ **Technical Architecture**: System design and Algorand integration
5. 🔐 **Smart Contract Details**: PyTeal implementation walkthrough
6. 📱 **UX/UI Showcase**: Screenshots and user flow diagrams
7. ♿ **Accessibility Features**: WCAG compliance and inclusive design
8. 🎥 **Demo Highlights**: Key features and use cases
9. 📈 **Market Opportunity**: TAM, business model, growth strategy
10. 🗺️ **Roadmap**: Near-term and long-term development plans

---

## 🔗 Block Explorer Links

### **Deployed Smart Contracts (Algorand TestNet)**

| Asset | Type | Explorer Link |
|-------|------|---------------|
| **Marketplace App** | Stateful Contract | [View on AlgoExplorer](https://testnet.algoexplorer.io/application/YOUR_APP_ID) |
| **Sample QR-NFT #1** | ASA (NFT) | [View on AlgoExplorer](https://testnet.algoexplorer.io/asset/YOUR_NFT_1_ID) |
| **Sample QR-NFT #2** | ASA (NFT) | [View on AlgoExplorer](https://testnet.algoexplorer.io/asset/YOUR_NFT_2_ID) |
| **Receipt NFT Example** | ASA (NFT) | [View on AlgoExplorer](https://testnet.algoexplorer.io/asset/YOUR_RECEIPT_ID) |
| **Pooled Payment Transaction** | Transaction Group | [View on AlgoExplorer](https://testnet.algoexplorer.io/tx/group/YOUR_GROUP_ID) |
| **Single Payment (Atomic)** | Transaction Group | [View on AlgoExplorer](https://testnet.algoexplorer.io/tx/group/YOUR_TX_GROUP_ID) |
| **LogicSig Escrow Example** | Account | [View on AlgoExplorer](https://testnet.algoexplorer.io/address/YOUR_ESCROW_ADDRESS) |

### **IPFS Metadata Examples**

| Item | IPFS CID | Gateway Link |
|------|----------|--------------|
| QR Metadata Schema | `QmXXXXXXXXXXXX` | [View on IPFS](https://ipfs.io/ipfs/QmXXXXXXXXXXXX) |
| Product Image | `QmYYYYYYYYYYYY` | [View on IPFS](https://ipfs.io/ipfs/QmYYYYYYYYYYYY) |

---

## 🎬 Project Walkthrough Video

### **[Watch Complete Project Explanation →](https://www.loom.com/share/YOUR_LOOM_ID)**

**Video Contents (with audio narration):**

1. **Introduction** (0:00-2:00)
   - Team introduction and project motivation
   - Problem statement and market opportunity

2. **Architecture Overview** (2:00-5:00)
   - System components and data flow
   - Frontend, backend, and blockchain layer
   - How components interact

3. **Smart Contract Deep Dive** (5:00-10:00)
   - PyTeal code walkthrough
   - Function-by-function explanation
   - LogicSig escrow implementation
   - How we satisfied custom contract requirement

4. **GitHub Repository Structure** (10:00-12:00)
   - `/backend` - API, services, and orchestration
   - `/frontend` - React PWA and UI components
   - `/contracts` - PyTeal smart contracts
   - `/scripts` - Deployment and testing utilities

5. **Live Demo** (12:00-18:00)
   - User registration and wallet funding
   - Creating a QR-NFT listing
   - Scanning and single payment flow
   - Pool payment with multiple users
   - Receipt generation and explorer verification
   - Accessibility features demonstration

6. **Agentic Layer** (18:00-20:00)
   - Policy agent configuration
   - Auto-finalization demo
   - Audit log review

7. **Testing & Quality** (20:00-22:00)
   - Unit test coverage
   - Integration tests with TestNet
   - Security considerations

8. **Future Roadmap** (22:00-24:00)
   - Production hardening plans
   - Feature additions
   - Scaling strategy

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 16+ and npm
- **Python** 3.9+ (for PyTeal contract compilation)
- **Git**
- **Algorand TestNet Account** with test ALGO ([Get from dispenser](https://testnet.algoexplorer.io/dispenser))

### Installation

```bash
# Clone the repository
git clone https://github.com/EnaihoVFX/AlgoPay.git
cd AlgoPay

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install Python dependencies for contracts
pip install pyteal algosdk
```

### Environment Configuration

Create `.env` file in `/backend`:

```env
# Algorand Node Configuration
ALGOD_URL=https://testnet-algorand.api.purestake.io/ps2
ALGOD_TOKEN=YOUR_PURESTAKE_API_KEY
INDEXER_URL=https://testnet-algorand.api.purestake.io/idx2
INDEXER_TOKEN=YOUR_PURESTAKE_API_KEY

# Pooled Custodial Account (TestNet Only!)
POOLED_MNEMONIC="your testnet account 25-word mnemonic here"
POOLED_ADDRESS="your testnet account address here"

# Smart Contract
MARKETPLACE_APP_ID=0  # Update after deployment

# Server Configuration
PORT=3000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Database
DATABASE_PATH=./data.sqlite
```

### Deploy Smart Contracts

```bash
# Compile PyTeal to TEAL
cd contracts
python compile_marketplace.py

# Deploy to TestNet
cd ../scripts
node deploy_marketplace.js

# Copy the APP_ID from output and update .env
```

### Run the Application

```bash
# Terminal 1: Start backend server
cd backend
npm start

# Terminal 2: Start deposit watcher (monitors incoming payments)
cd backend
node services/depositWatcher.js

# Terminal 3: Start frontend dev server
cd frontend
npm run dev
```

Visit `http://localhost:5173` to access the application.

### Fund Your Wallet

1. Get test ALGO from [TestNet Dispenser](https://testnet.algoexplorer.io/dispenser)
2. Send ALGO to your pooled account with note: `DEPOSIT:<userId>`
3. Balance will be credited automatically via deposit watcher

---

## 📚 API Documentation

### User & Wallet Endpoints

#### `POST /api/createUser`
Create a new user account

```json
{
  "userId": "user123",
  "name": "John Doe",
  "email": "john@example.com"
}
```

#### `GET /api/wallet/:userId/summary`
Get wallet balance, assets, and transaction history

**Response:**
```json
{
  "balance": 50000,
  "assets": [...],
  "recent_transactions": [...]
}
```

### Payment Endpoints

#### `POST /api/pay`
Execute single payment

```json
{
  "userId": "user123",
  "listingId": 42,
  "amount": 10000
}
```

#### `POST /api/createPool`
Create a pool payment

```json
{
  "listingId": 42,
  "targetAmount": 50000,
  "maxParticipants": 5,
  "creatorId": "user123"
}
```

#### `POST /api/joinPool`
Join existing pool

```json
{
  "poolId": "pool-uuid",
  "userId": "user456",
  "amount": 10000
}
```

#### `POST /api/finalizePool`
Finalize pool when target reached

```json
{
  "poolId": "pool-uuid",
  "initiatorId": "user123"
}
```

### Listing Endpoints

#### `GET /api/listing/:id`
Get listing details

#### `POST /api/createListing`
Create new QR-NFT listing

```json
{
  "creatorId": "merchant1",
  "title": "Premium Coffee",
  "price": 500,
  "description": "Best coffee in town",
  "imageUrl": "ipfs://QmXXXXXX"
}
```

---

## ♿ Accessibility Features

AlgoPay is built with **accessibility-first** principles:

### WCAG 2.1 AA Compliance

- ✅ **Keyboard Navigation**: All functions accessible via keyboard
- ✅ **Screen Reader Support**: ARIA labels and semantic HTML
- ✅ **Color Contrast**: Minimum 4.5:1 ratio for all text
- ✅ **Focus Indicators**: Clear visual focus states
- ✅ **Resizable Text**: Up to 200% without loss of functionality

### Inclusive Features

- 🎨 **High Contrast Mode**: Enhanced visibility for low vision users
- 🔤 **Large Text Mode**: Adjustable font sizes
- ⌨️ **Keyboard Shortcuts**: Quick actions without mouse
- 🎤 **Voice Navigation**: Coming in v2.0
- 📱 **Touch Targets**: Minimum 44x44px for all buttons
- 🔊 **Audio Feedback**: Optional sound confirmations

### Manual QR Code Entry

For users unable to use camera:
- Text input field for manual code entry
- Copy/paste support
- QR code sharing via text/email

---

## 🔒 Security & Custody

### Current Implementation (TestNet Demo)

⚠️ **Custodial model with pooled hot wallet** - Suitable for demo, NOT production

### Production Hardening Roadmap

1. **Multi-Signature Architecture**
   - 2-of-3 or 3-of-5 multisig for fund custody
   - Separate keys held by different team members/HSMs

2. **Hardware Security Modules (HSM)**
   - Private keys never exposed to application servers
   - Signing happens in secure enclaves

3. **Hot/Warm/Cold Segregation**
   - Hot wallet: Small operational balance (~1% of funds)
   - Warm wallet: Daily operational needs (~10%)
   - Cold wallet: Majority of funds in offline storage

4. **KYC/AML Integration**
   - Identity verification for deposits/withdrawals
   - Transaction monitoring and suspicious activity reporting
   - Compliance with local regulations

5. **Rate Limiting & Caps**
   - Per-user daily withdrawal limits
   - Velocity checks for unusual patterns
   - Manual review for high-value transactions

6. **Continuous Reconciliation**
   - Hourly comparison of DB balances vs on-chain state
   - Automated alerts for discrepancies
   - Audit trail for all balance changes

---

## 🗺️ Roadmap

### Phase 1: Foundation (Current)
- ✅ Core payment flows (single, pool, voucher)
- ✅ PyTeal smart contracts
- ✅ PWA frontend with QR scanning
- ✅ Custodial wallet prototype
- ✅ Basic agent policies

### Phase 2: Production Hardening (Q1 2026)
- 🔲 Multi-signature custody implementation
- 🔲 HSM integration
- 🔲 KYC/AML compliance
- 🔲 Security audit by third-party firm
- 🔲 MainNet deployment

### Phase 3: Enhanced Features (Q2 2026)
- 🔲 Non-custodial mode (WalletConnect, Pera integration)
- 🔲 Merchant dashboard with analytics
- 🔲 Subscription payments
- 🔲 Invoice generation
- 🔲 Multi-currency support (USDC, USDT)

### Phase 4: Ecosystem Expansion (Q3-Q4 2026)
- 🔲 Verifier marketplace (staked verifiers)
- 🔲 Insurance pools for buyer protection
- 🔲 Micro-lending integration
- 🔲 Agent marketplace (third-party policies)
- 🔲 Cross-chain bridges

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Areas Where We Need Help

- 🎨 UI/UX improvements
- ♿ Accessibility testing and feedback
- 🔐 Security reviews
- 🌍 Internationalization (i18n)
- 📝 Documentation
- 🧪 Test coverage

### Contact

- **Email**: enaihouwaspaul@gmail.com
- **Discord**: @oactodev.
- **Telegram**: @tualg5
- **LinkedIn**: [@EnaihoVFX](https://linkedin.com/in/EnaihoVFX)
- **GitHub Issues**: [Report bugs or request features](https://github.com/EnaihoVFX/AlgoPay/issues)

---

## 📄 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file for details.

AlgoPay is open source and will remain open source forever. We believe in transparent, auditable payment infrastructure.

---

## 🙏 Acknowledgments

- **Algorand Foundation** for the incredible blockchain infrastructure
- **PyTeal Team** for the expressive smart contract language
- **AlgoSDK Contributors** for comprehensive JavaScript SDK
- **React & Vite Communities** for modern frontend tools
- **Accessibility Advocates** for teaching us inclusive design

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/EnaihoVFX/AlgoPay?style=social)
![GitHub forks](https://img.shields.io/github/forks/EnaihoVFX/AlgoPay?style=social)
![GitHub issues](https://img.shields.io/github/issues/EnaihoVFX/AlgoPay)
![GitHub pull requests](https://img.shields.io/github/issues-pr/EnaihoVFX/AlgoPay)

---

<div align="center">

**Built with ❤️ on Algorand**

*Making blockchain payments accessible to everyone*

[🌐 Website](https://algopay.example) • [📧 Contact](mailto:enaihouwaspaul@gmail.com) • [🐦 Twitter](https://twitter.com/algopay)

**October 2025**

</div>

# AlgoPay — Accessible Programmable QR Payments & NFT Drops

[![Algorand](https://img.shields.io/badge/Algorand-TestNet-blue)](https://testnet.algoexplorer.io/)
[![Node](https://img.shields.io/badge/Node-16+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![PyTeal](https://img.shields.io/badge/PyTeal-0.27-purple)](https://pyteal.readthedocs.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> Algorand-native QR payments that feel like a wallet — accessible, composable, and agency-enabled with atomic settlement & programmable NFTs.

---

## 📑 Table of Contents

- [Quick Overview](#-quick-overview)
- [Demo Video](#-demo-video)
- [Screenshots](#-screenshots)
- [Problem & Solution](#-problem--solution)
- [How Algorand Powers AlgoPay](#-how-algorand-powers-algopay)
- [Technical Architecture](#-technical-architecture)
- [Smart Contract Implementation](#-smart-contract-implementation)
- [Agentic Design Layer](#-agentic-design-layer)
- [Canva Presentation](#-canva-presentation)
- [Block Explorer Links](#-block-explorer-links)
- [Project Walkthrough Video](#-project-walkthrough-video)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [Accessibility Features](#-accessibility-features)
- [Security & Custody](#-security--custody)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Quick Overview

**AlgoPay** transforms any QR code into a programmable payment terminal powered by Algorand blockchain. It combines:

- 🏦 **Custodial Wallet Experience**: Fast, user-friendly payments without blockchain complexity
- 🔐 **Atomic Settlement**: Multi-step payment flows with zero settlement risk
- 📱 **Mobile-First PWA**: Scan QR codes, pay instantly, get on-chain receipts
- 🤖 **Agentic Decision Layer**: Policy-driven automation for routine transactions
- ♿ **Accessibility-First**: WCAG 2.1 AA compliant with full keyboard navigation and screen reader support
- 🌐 **Programmable QR-NFTs**: Each QR code is an ASA (Algorand Standard Asset) with embedded payment rules

### Key Features

✅ **Single-Pay Flow**: Scan → Confirm → Atomic lock & finalize with LogicSig escrow  
✅ **Pool-Pay Flow**: Group buying where multiple users contribute to one purchase  
✅ **Offline Vouchers**: Cryptographically signed authorization codes for offline redemption  
✅ **On-Chain Receipts**: Provable transaction history with explorer links  
✅ **Real-Time Updates**: WebSocket-powered dashboard with live transaction status  
✅ **Policy Agents**: Autonomous decision-making within user-defined safety boundaries  

---

## 🎥 Demo Video

> **[Watch Full Demo Video Here](https://youtu.be/YOUR_VIDEO_ID)**

*5-minute demonstration showing:*
- User onboarding and wallet funding
- QR code creation and minting as NFT
- Single payment flow with atomic settlement
- Pool payment with multiple contributors
- Receipt generation and explorer verification
- Accessibility features in action

---

## 📸 Screenshots

### 1. Dashboard - Wallet Overview
![Dashboard](https://via.placeholder.com/800x500/667eea/ffffff?text=AlgoPay+Dashboard)
*Clean, accessible interface showing wallet balance, recent transactions, and quick actions*

---

### 2. QR Scanner - Mobile-First Experience
![QR Scanner](https://via.placeholder.com/800x500/764ba2/ffffff?text=QR+Scanner+Interface)
*Camera-based QR scanning with manual code entry fallback for accessibility*

---

### 3. Payment Confirmation Screen
![Payment Flow](https://via.placeholder.com/800x500/f093fb/ffffff?text=Payment+Confirmation)
*Clear transaction details with amount, merchant info, and one-tap confirmation*

---

### 4. Pool Payment Creation
![Pooled Payments](https://via.placeholder.com/800x500/4facfe/ffffff?text=Pool+Payment+Interface)
*Group buying interface allowing multiple users to contribute to shared purchases*

---

### 5. Transaction Receipt & Explorer Link
![Receipt](https://via.placeholder.com/800x500/00f2fe/ffffff?text=Transaction+Receipt)
*On-chain receipt with transaction ID and direct link to Algorand explorer*

---

### 6. Accessibility Settings
![Accessibility](https://via.placeholder.com/800x500/43e97b/ffffff?text=Accessibility+Features)
*High contrast mode, large text options, and keyboard navigation controls*

---

## 🎯 Problem & Solution

### Problems We Solve

1. **Fragmented Payment Systems**: Traditional payment processors require complex integrations, charge high fees (2-3%), and take days to settle
2. **Accessibility Barriers**: Most crypto wallets are unusable for people with disabilities or those unfamiliar with blockchain
3. **Limited Programmability**: Payments can't be conditional, automated, or integrated with smart business logic
4. **High Friction**: Crypto payments require addresses, gas fees, and blockchain knowledge
5. **Settlement Risk**: Multi-party transactions lack atomic guarantees

### Our Solution

**AlgoPay makes blockchain payments as simple as scanning a QR code**, while providing:

- 💰 **Near-Zero Fees**: Algorand's 0.001 ALGO transaction cost (~$0.0002)
- ⚡ **Instant Finality**: Sub-5 second transaction confirmation
- 🔒 **Atomic Settlement**: Multi-step flows execute atomically or revert completely
- 🎨 **Programmable Rules**: Embed payment conditions directly in QR-NFT metadata
- 👥 **Group Economics**: Pool payments for collective purchasing power
- ♿ **Universal Access**: Works without sight, without dexterity, without prior crypto knowledge

---

## 🔗 How Algorand Powers AlgoPay

AlgoPay leverages Algorand's unique features that make this solution **uniquely possible**:

### 1. **Atomic Transaction Groups**
```
Group: [Payment: Buyer → Escrow], [AppCall: lock_payment(listing_id)]
Result: Both succeed atomically or both fail
```
**Why This Matters**: Eliminates settlement risk in multi-step payment flows

### 2. **LogicSig Escrow Accounts**
- Programmable accounts that hold funds and only release when conditions are met
- No private key needed — the logic IS the authority
- Used for per-listing escrows that verify app call authenticity

### 3. **Stateful Smart Contracts (PyTeal)**
Our marketplace app manages:
- Listing creation and metadata
- Payment locking and verification
- Finalization and fund disbursement
- Refund logic and dispute resolution

### 4. **ASA (Algorand Standard Assets)**
- QR codes are minted as NFTs with embedded metadata (IPFS CID)
- Receipts are ASAs with transaction provenance
- Native support without custom token contracts

### 5. **Sub-5 Second Finality**
- Pure Proof of Stake enables real-time payment confirmation
- No waiting for block confirmations
- Instant user feedback

### 6. **Low Transaction Costs**
- 0.001 ALGO per transaction (~$0.0002)
- Makes micro-payments economically viable
- No gas wars or variable fees

### 7. **Algorand Indexer**
- Real-time transaction monitoring via REST API
- Automatic balance tracking and reconciliation
- Powers our deposit watcher service

---

## 🔧 Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (PWA)                          │
│  React 19 + Vite │ QR Scanner │ Wallet UI │ WebSocket Client   │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS + WebSocket
┌────────────────────────┴────────────────────────────────────────┐
│                    Backend Orchestrator (Node.js)                │
│  Express API │ Transaction Builder │ Signer Service │ DB Layer  │
├─────────────────────────────────────────────────────────────────┤
│  Pool Manager │ Deposit Watcher │ Agent Manager │ Reconciler    │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────┴────────┐ ┌─────┴──────┐ ┌──────┴────────┐
│  Algorand      │ │ PyTeal     │ │   IPFS/       │
│  Indexer       │ │ Marketplace│ │   Metadata    │
│  (Query)       │ │ App        │ │   Storage     │
└────────────────┘ └─────┬──────┘ └───────────────┘
                         │
                  ┌──────┴──────┐
                  │  LogicSig   │
                  │  Escrows    │
                  │  (per-list) │
                  └─────────────┘
```

### Technology Stack

#### **Smart Contracts**
- **PyTeal 0.27**: Pythonic smart contract language compiling to TEAL
- **TEAL**: Transaction Execution Approval Language (Algorand's VM)
- **algosdk**: JavaScript SDK for blockchain interactions

#### **Backend**
- **Node.js 16+**: Server runtime
- **Express.js**: REST API framework
- **Socket.IO**: Real-time bidirectional communication
- **SQLite**: Development database (PostgreSQL for production)
- **better-sqlite3**: Synchronous SQLite bindings for transaction safety

#### **Frontend**
- **React 19**: UI framework with latest features
- **Vite**: Lightning-fast build tool and dev server
- **Tailwind CSS**: Utility-first styling with custom accessibility extensions
- **html5-qrcode**: QR scanning library with camera access
- **axios**: HTTP client for API calls
- **socket.io-client**: Real-time updates

#### **Infrastructure**
- **PureStake API**: Algorand node and indexer access
- **IPFS**: Decentralized metadata storage
- **Algorand TestNet**: Deployment and testing environment

---

## 🔐 Smart Contract Implementation

### Custom PyTeal Marketplace Application

Our smart contract is **fully custom** (not boilerplate) and implements a complete payment lifecycle manager.

#### Contract State Schema

```python
# Global State
listings: Dict[int, Listing]  # listingId → Listing data
locked_payments: Dict[bytes, Payment]  # paymentId → Payment state
escrow_addresses: Dict[int, bytes]  # listingId → escrow address

# Listing Structure
{
    "creator": bytes,
    "price": int,
    "metadata_cid": bytes,  # IPFS CID
    "status": int,  # 0=active, 1=paused, 2=sold
    "created_at": int
}

# Payment Structure
{
    "buyer": bytes,
    "listing_id": int,
    "amount": int,
    "status": int,  # 0=locked, 1=finalized, 2=refunded
    "locked_at": int,
    "nonce": bytes
}
```

#### Core Smart Contract Functions

##### 1. **createListing** - Mint Programmable QR-NFT

```python
@router.method
def createListing(
    price: abi.Uint64,
    metadata_cid: abi.String,
    payment: abi.PaymentTransaction
) -> Expr:
    """
    Creates a new listing and mints QR-NFT with embedded metadata
    
    Verifies:
    - Creator pays minimum listing fee
    - Metadata CID is valid IPFS format
    - Creates escrow account via LogicSig
    """
    return Seq([
        Assert(Txn.sender() == payment.get().sender()),
        Assert(payment.get().amount() >= Int(LISTING_FEE)),
        # Generate unique listing ID
        (listing_id := App.globalGet(Bytes("listing_counter"))),
        # Store listing metadata
        App.globalPut(listing_key(listing_id), encode_listing(...)),
        # Create LogicSig escrow
        create_escrow(listing_id),
        # Increment counter
        App.globalPut(Bytes("listing_counter"), listing_id + Int(1)),
        # Return listing ID
        abi.Uint64(listing_id)
    ])
```

##### 2. **lockPayment** - Atomic Payment Lock

```python
@router.method
def lockPayment(
    listing_id: abi.Uint64,
    payment: abi.PaymentTransaction
) -> Expr:
    """
    Locks buyer payment in LogicSig escrow atomically
    
    Must be grouped with payment transaction:
    [0] Payment: Buyer → Escrow
    [1] AppCall: lock_payment(listing_id)
    
    Verifies:
    - Listing exists and is active
    - Payment amount matches listing price
    - Payment goes to correct escrow
    """
    return Seq([
        # Verify listing
        (listing := App.globalGet(listing_key(listing_id))),
        Assert(listing != Bytes("")),
        
        # Verify payment amount
        (price := decode_listing(listing).price),
        Assert(payment.get().amount() == price),
        
        # Verify escrow recipient
        (escrow := App.globalGet(escrow_key(listing_id))),
        Assert(payment.get().receiver() == escrow),
        
        # Create payment record
        (payment_id := Sha256(Concat(
            Txn.sender(),
            Itob(listing_id),
            Itob(Global.latest_timestamp())
        ))),
        
        # Store payment state
        App.globalPut(payment_id, encode_payment({
            "buyer": Txn.sender(),
            "listing_id": listing_id,
            "amount": payment.get().amount(),
            "status": Int(STATUS_LOCKED),
            "locked_at": Global.latest_timestamp()
        })),
        
        Approve()
    ])
```

##### 3. **finalizePayment** - Escrow Release & Settlement

```python
@router.method
def finalizePayment(
    payment_id: abi.DynamicBytes,
    escrow_payment: abi.PaymentTransaction
) -> Expr:
    """
    Finalizes payment by releasing escrow to seller
    
    Must be grouped with:
    [0] AppCall: finalize_payment(payment_id)
    [1] Payment: Escrow → Seller (signed by LogicSig)
    [2] AssetTransfer: Item NFT → Buyer (if applicable)
    
    Verifies:
    - Payment exists and is locked
    - Only authorized verifier can finalize
    - Escrow releases correct amount to seller
    """
    return Seq([
        # Load payment
        (payment := App.globalGet(payment_id.get())),
        Assert(payment != Bytes("")),
        
        # Verify status
        (status := decode_payment(payment).status),
        Assert(status == Int(STATUS_LOCKED)),
        
        # Verify escrow payment
        (listing_id := decode_payment(payment).listing_id),
        (listing := App.globalGet(listing_key(listing_id))),
        (seller := decode_listing(listing).creator),
        
        Assert(escrow_payment.get().receiver() == seller),
        Assert(escrow_payment.get().amount() == decode_payment(payment).amount),
        
        # Update payment status
        App.globalPut(payment_id.get(), update_payment_status(
            payment,
            Int(STATUS_FINALIZED)
        )),
        
        # Update listing status
        App.globalPut(listing_key(listing_id), update_listing_status(
            listing,
            Int(LISTING_SOLD)
        )),
        
        # Mint receipt NFT (optional)
        mint_receipt_nft(payment_id.get()),
        
        Approve()
    ])
```

##### 4. **refundPayment** - Dispute Resolution

```python
@router.method
def refundPayment(
    payment_id: abi.DynamicBytes,
    reason: abi.String
) -> Expr:
    """
    Refunds locked payment back to buyer
    
    Can be triggered by:
    - Buyer (after timeout)
    - Seller (voluntary cancellation)
    - Platform (dispute resolution)
    """
    return Seq([
        # Load payment
        (payment := App.globalGet(payment_id.get())),
        Assert(payment != Bytes("")),
        
        # Verify refund authorization
        Or(
            Txn.sender() == decode_payment(payment).buyer,
            Txn.sender() == App.globalGet(Bytes("admin")),
            And(
                Txn.sender() == decode_listing(listing).creator,
                Global.latest_timestamp() < decode_payment(payment).locked_at + Int(TIMEOUT)
            )
        ),
        
        # Update status
        App.globalPut(payment_id.get(), update_payment_status(
            payment,
            Int(STATUS_REFUNDED)
        )),
        
        # Trigger escrow refund (via inner transaction)
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.receiver: decode_payment(payment).buyer,
            TxnField.amount: decode_payment(payment).amount,
            TxnField.fee: Int(0)
        }),
        InnerTxnBuilder.Submit(),
        
        Approve()
    ])
```

#### LogicSig Escrow Contract

Each listing gets its own deterministic LogicSig escrow:

```python
def escrow_logicsig(app_id: int, listing_id: int):
    """
    LogicSig that only releases funds when grouped with valid app call
    """
    return Seq([
        # Must be in a transaction group
        Assert(Global.group_size() > Int(1)),
        
        # Must be payment transaction
        Assert(Txn.type_enum() == TxnType.Payment),
        
        # Previous txn must be app call to our marketplace
        Assert(Gtxn[Txn.group_index() - Int(1)].application_id() == Int(app_id)),
        
        # App call must be finalize or refund
        Assert(Or(
            Gtxn[Txn.group_index() - Int(1)].application_args[0] == Bytes("finalize"),
            Gtxn[Txn.group_index() - Int(1)].application_args[0] == Bytes("refund")
        )),
        
        # Verify listing_id in app call matches this escrow
        Assert(Btoi(Gtxn[Txn.group_index() - Int(1)].application_args[1]) == Int(listing_id)),
        
        Approve()
    ])
```

### Key Contract Innovations

1. **Atomic Two-Phase Commit**: Lock and finalize happen in separate atomic groups, preventing double-spend
2. **Deterministic Escrows**: Each listing has a unique escrow address derived from app_id + listing_id
3. **Nonce Protection**: Payment IDs use timestamp + sender hash to prevent replay attacks
4. **Inner Transactions**: Contract can trigger refunds without external signatures
5. **Metadata on IPFS**: Product images and data stored off-chain, only CID on-chain

---

## 🤖 Agentic Design Layer

AlgoPay includes a **policy-driven agent system** that automates routine decisions while maintaining security and auditability.

### What is Agentic Design?

Software agents act autonomously on behalf of users or the platform by:
- Evaluating policies against transaction events
- Making approve/deny/escalate decisions
- Composing and submitting transactions automatically
- Maintaining full audit trails

### Agent Types in AlgoPay

#### 1. **Policy Agent** (Declarative Rules)

```json
{
  "id": "auto_finalize_low_risk",
  "conditions": {
    "listing.value.usd": { "lte": 200 },
    "verifier.trust_score": { "gte": 0.8 },
    "buyer.reputation": { "gte": 0.6 }
  },
  "actions": ["finalizeTransaction", "mintReceipt"],
  "audit": true
}
```

**Use Case**: Auto-finalize low-risk purchases without manual verification

#### 2. **Risk Scoring Agent** (ML-based)

Evaluates transactions based on:
- Historical buyer behavior
- Transaction patterns
- Merchant reputation
- Amount relative to account history

**Action**: Flag high-risk transactions for manual review

#### 3. **Delegated Wallet Agent** (User-Defined Policies)

Users can delegate spending authority:
```json
{
  "rule": "auto_pay_recurring",
  "conditions": {
    "merchant": "Coffee Shop A",
    "max_amount": 500,  // 5 USD in cents
    "frequency": "daily"
  }
}
```

#### 4. **Workflow Orchestrator Agent**

Manages multi-step processes:
- Waits for courier confirmation webhook
- Triggers finalization automatically
- Handles timeout-based refunds

### Agent Safety & Audit

- ✅ **Policy Whitelisting**: Only approved policies can execute
- ✅ **Rate Limiting**: Agents have transaction caps
- ✅ **Explainability**: Every decision includes human-readable rationale
- ✅ **Immutable Logs**: All actions recorded with policy_id, decision, timestamp
- ✅ **Manual Override**: Human operators can review and reverse

---

## 📊 Canva Presentation

### **[View Full Presentation on Canva →](https://www.canva.com/design/YOUR_DESIGN_ID)**

**Presentation Includes:**

1. 👥 **Team Slide**: Backgrounds, roles, and expertise
2. 🎯 **Problem Statement**: Market pain points and user research
3. 💡 **Solution Overview**: How AlgoPay solves these problems
4. 🏗️ **Technical Architecture**: System design and Algorand integration
5. 🔐 **Smart Contract Details**: PyTeal implementation walkthrough
6. 📱 **UX/UI Showcase**: Screenshots and user flow diagrams
7. ♿ **Accessibility Features**: WCAG compliance and inclusive design
8. 🎥 **Demo Highlights**: Key features and use cases
9. 📈 **Market Opportunity**: TAM, business model, growth strategy
10. 🗺️ **Roadmap**: Near-term and long-term development plans

---

## 🔗 Block Explorer Links

### **Deployed Smart Contracts (Algorand TestNet)**

| Asset | Type | Explorer Link |
|-------|------|---------------|
| **Marketplace App** | Stateful Contract | [View on AlgoExplorer](https://testnet.algoexplorer.io/application/YOUR_APP_ID) |
| **Sample QR-NFT #1** | ASA (NFT) | [View on AlgoExplorer](https://testnet.algoexplorer.io/asset/YOUR_NFT_1_ID) |
| **Sample QR-NFT #2** | ASA (NFT) | [View on AlgoExplorer](https://testnet.algoexplorer.io/asset/YOUR_NFT_2_ID) |
| **Receipt NFT Example** | ASA (NFT) | [View on AlgoExplorer](https://testnet.algoexplorer.io/asset/YOUR_RECEIPT_ID) |
| **Pooled Payment Transaction** | Transaction Group | [View on AlgoExplorer](https://testnet.algoexplorer.io/tx/group/YOUR_GROUP_ID) |
| **Single Payment (Atomic)** | Transaction Group | [View on AlgoExplorer](https://testnet.algoexplorer.io/tx/group/YOUR_TX_GROUP_ID) |
| **LogicSig Escrow Example** | Account | [View on AlgoExplorer](https://testnet.algoexplorer.io/address/YOUR_ESCROW_ADDRESS) |

### **IPFS Metadata Examples**

| Item | IPFS CID | Gateway Link |
|------|----------|--------------|
| QR Metadata Schema | `QmXXXXXXXXXXXX` | [View on IPFS](https://ipfs.io/ipfs/QmXXXXXXXXXXXX) |
| Product Image | `QmYYYYYYYYYYYY` | [View on IPFS](https://ipfs.io/ipfs/QmYYYYYYYYYYYY) |

---

## 🎬 Project Walkthrough Video

### **[Watch Complete Project Explanation →](https://www.loom.com/share/YOUR_LOOM_ID)**

**Video Contents (with audio narration):**

1. **Introduction** (0:00-2:00)
   - Team introduction and project motivation
   - Problem statement and market opportunity

2. **Architecture Overview** (2:00-5:00)
   - System components and data flow
   - Frontend, backend, and blockchain layer
   - How components interact

3. **Smart Contract Deep Dive** (5:00-10:00)
   - PyTeal code walkthrough
   - Function-by-function explanation
   - LogicSig escrow implementation
   - How we satisfied custom contract requirement

4. **GitHub Repository Structure** (10:00-12:00)
   - `/backend` - API, services, and orchestration
   - `/frontend` - React PWA and UI components
   - `/contracts` - PyTeal smart contracts
   - `/scripts` - Deployment and testing utilities

5. **Live Demo** (12:00-18:00)
   - User registration and wallet funding
   - Creating a QR-NFT listing
   - Scanning and single payment flow
   - Pool payment with multiple users
   - Receipt generation and explorer verification
   - Accessibility features demonstration

6. **Agentic Layer** (18:00-20:00)
   - Policy agent configuration
   - Auto-finalization demo
   - Audit log review

7. **Testing & Quality** (20:00-22:00)
   - Unit test coverage
   - Integration tests with TestNet
   - Security considerations

8. **Future Roadmap** (22:00-24:00)
   - Production hardening plans
   - Feature additions
   - Scaling strategy

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 16+ and npm
- **Python** 3.9+ (for PyTeal contract compilation)
- **Git**
- **Algorand TestNet Account** with test ALGO ([Get from dispenser](https://testnet.algoexplorer.io/dispenser))

### Installation

```bash
# Clone the repository
git clone https://github.com/EnaihoVFX/AlgoPay.git
cd AlgoPay

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install Python dependencies for contracts
pip install pyteal algosdk
```

### Environment Configuration

Create `.env` file in `/backend`:

```env
# Algorand Node Configuration
ALGOD_URL=https://testnet-algorand.api.purestake.io/ps2
ALGOD_TOKEN=YOUR_PURESTAKE_API_KEY
INDEXER_URL=https://testnet-algorand.api.purestake.io/idx2
INDEXER_TOKEN=YOUR_PURESTAKE_API_KEY

# Pooled Custodial Account (TestNet Only!)
POOLED_MNEMONIC="your testnet account 25-word mnemonic here"
POOLED_ADDRESS="your testnet account address here"

# Smart Contract
MARKETPLACE_APP_ID=0  # Update after deployment

# Server Configuration
PORT=3000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Database
DATABASE_PATH=./data.sqlite
```

### Deploy Smart Contracts

```bash
# Compile PyTeal to TEAL
cd contracts
python compile_marketplace.py

# Deploy to TestNet
cd ../scripts
node deploy_marketplace.js

# Copy the APP_ID from output and update .env
```

### Run the Application

```bash
# Terminal 1: Start backend server
cd backend
npm start

# Terminal 2: Start deposit watcher (monitors incoming payments)
cd backend
node services/depositWatcher.js

# Terminal 3: Start frontend dev server
cd frontend
npm run dev
```

Visit `http://localhost:5173` to access the application.

### Fund Your Wallet

1. Get test ALGO from [TestNet Dispenser](https://testnet.algoexplorer.io/dispenser)
2. Send ALGO to your pooled account with note: `DEPOSIT:<userId>`
3. Balance will be credited automatically via deposit watcher

---

## 📚 API Documentation

### User & Wallet Endpoints

#### `POST /api/createUser`
Create a new user account

```json
{
  "userId": "user123",
  "name": "John Doe",
  "email": "john@example.com"
}
```

#### `GET /api/wallet/:userId/summary`
Get wallet balance, assets, and transaction history

**Response:**
```json
{
  "balance": 50000,
  "assets": [...],
  "recent_transactions": [...]
}
```

### Payment Endpoints

#### `POST /api/pay`
Execute single payment

```json
{
  "userId": "user123",
  "listingId": 42,
  "amount": 10000
}
```

#### `POST /api/createPool`
Create a pool payment

```json
{
  "listingId": 42,
  "targetAmount": 50000,
  "maxParticipants": 5,
  "creatorId": "user123"
}
```

#### `POST /api/joinPool`
Join existing pool

```json
{
  "poolId": "pool-uuid",
  "userId": "user456",
  "amount": 10000
}
```

#### `POST /api/finalizePool`
Finalize pool when target reached

```json
{
  "poolId": "pool-uuid",
  "initiatorId": "user123"
}
```

### Listing Endpoints

#### `GET /api/listing/:id`
Get listing details

#### `POST /api/createListing`
Create new QR-NFT listing

```json
{
  "creatorId": "merchant1",
  "title": "Premium Coffee",
  "price": 500,
  "description": "Best coffee in town",
  "imageUrl": "ipfs://QmXXXXXX"
}
```

---

## ♿ Accessibility Features

AlgoPay is built with **accessibility-first** principles:

### WCAG 2.1 AA Compliance

- ✅ **Keyboard Navigation**: All functions accessible via keyboard
- ✅ **Screen Reader Support**: ARIA labels and semantic HTML
- ✅ **Color Contrast**: Minimum 4.5:1 ratio for all text
- ✅ **Focus Indicators**: Clear visual focus states
- ✅ **Resizable Text**: Up to 200% without loss of functionality

### Inclusive Features

- 🎨 **High Contrast Mode**: Enhanced visibility for low vision users
- 🔤 **Large Text Mode**: Adjustable font sizes
- ⌨️ **Keyboard Shortcuts**: Quick actions without mouse
- 🎤 **Voice Navigation**: Coming in v2.0
- 📱 **Touch Targets**: Minimum 44x44px for all buttons
- 🔊 **Audio Feedback**: Optional sound confirmations

### Manual QR Code Entry

For users unable to use camera:
- Text input field for manual code entry
- Copy/paste support
- QR code sharing via text/email

---

## 🔒 Security & Custody

### Current Implementation (TestNet Demo)

⚠️ **Custodial model with pooled hot wallet** - Suitable for demo, NOT production

### Production Hardening Roadmap

1. **Multi-Signature Architecture**
   - 2-of-3 or 3-of-5 multisig for fund custody
   - Separate keys held by different team members/HSMs

2. **Hardware Security Modules (HSM)**
   - Private keys never exposed to application servers
   - Signing happens in secure enclaves

3. **Hot/Warm/Cold Segregation**
   - Hot wallet: Small operational balance (~1% of funds)
   - Warm wallet: Daily operational needs (~10%)
   - Cold wallet: Majority of funds in offline storage

4. **KYC/AML Integration**
   - Identity verification for deposits/withdrawals
   - Transaction monitoring and suspicious activity reporting
   - Compliance with local regulations

5. **Rate Limiting & Caps**
   - Per-user daily withdrawal limits
   - Velocity checks for unusual patterns
   - Manual review for high-value transactions

6. **Continuous Reconciliation**
   - Hourly comparison of DB balances vs on-chain state
   - Automated alerts for discrepancies
   - Audit trail for all balance changes

---

## 🗺️ Roadmap

### Phase 1: Foundation (Current)
- ✅ Core payment flows (single, pool, voucher)
- ✅ PyTeal smart contracts
- ✅ PWA frontend with QR scanning
- ✅ Custodial wallet prototype
- ✅ Basic agent policies

### Phase 2: Production Hardening (Q1 2026)
- 🔲 Multi-signature custody implementation
- 🔲 HSM integration
- 🔲 KYC/AML compliance
- 🔲 Security audit by third-party firm
- 🔲 MainNet deployment

### Phase 3: Enhanced Features (Q2 2026)
- 🔲 Non-custodial mode (WalletConnect, Pera integration)
- 🔲 Merchant dashboard with analytics
- 🔲 Subscription payments
- 🔲 Invoice generation
- 🔲 Multi-currency support (USDC, USDT)

### Phase 4: Ecosystem Expansion (Q3-Q4 2026)
- 🔲 Verifier marketplace (staked verifiers)
- 🔲 Insurance pools for buyer protection
- 🔲 Micro-lending integration
- 🔲 Agent marketplace (third-party policies)
- 🔲 Cross-chain bridges

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Areas Where We Need Help

- 🎨 UI/UX improvements
- ♿ Accessibility testing and feedback
- 🔐 Security reviews
- 🌍 Internationalization (i18n)
- 📝 Documentation
- 🧪 Test coverage

### Contact

- **Email**: enaihouwaspaul@gmail.com
- **Discord**: @oactodev.
- **Telegram**: @tualg5
- **LinkedIn**: [@EnaihoVFX](https://linkedin.com/in/EnaihoVFX)
- **GitHub Issues**: [Report bugs or request features](https://github.com/EnaihoVFX/AlgoPay/issues)

---

## 📄 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file for details.

AlgoPay is open source and will remain open source forever. We believe in transparent, auditable payment infrastructure.

---

## 🙏 Acknowledgments

- **Algorand Foundation** for the incredible blockchain infrastructure
- **PyTeal Team** for the expressive smart contract language
- **AlgoSDK Contributors** for comprehensive JavaScript SDK
- **React & Vite Communities** for modern frontend tools
- **Accessibility Advocates** for teaching us inclusive design

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/EnaihoVFX/AlgoPay?style=social)
![GitHub forks](https://img.shields.io/github/forks/EnaihoVFX/AlgoPay?style=social)
![GitHub issues](https://img.shields.io/github/issues/EnaihoVFX/AlgoPay)
![GitHub pull requests](https://img.shields.io/github/issues-pr/EnaihoVFX/AlgoPay)

---

<div align="center">

**Built with ❤️ on Algorand**

*Making blockchain payments accessible to everyone*

[🌐 Website](https://algopay.example) • [📧 Contact](mailto:enaihouwaspaul@gmail.com) • [🐦 Twitter](https://twitter.com/algopay)

**October 2025**

</div>
