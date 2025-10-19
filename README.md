# 🎫 StickerPay - Blockchain Marketplace Payment System

[![Algorand](https://img.shields.io/badge/Algorand-TestNet-blue)](https://testnet.algoexplorer.io/)
[![Node](https://img.shields.io/badge/Node-16+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![PyTeal](https://img.shields.io/badge/PyTeal-0.27-purple)](https://pyteal.readthedocs.io/)

AlgoPay — accessible programmable QR payments & NFT drops (README)

Tagline: Algorand-native QR payments that feel like a wallet — accessible, composable, and agency-enabled.

AlgoPay turns a printed QR (or NFC/short-code) into a programmable payment terminal: creators mint QR-NFTs containing product metadata and rules; buyers use a mobile-first custodial wallet to scan, pay, claim NFTs, or join pooled purchases; the platform handles atomic settlement, receipts, and dispute primitives — all while exposing an agentic layer so transactions can act autonomously under policy.

This README explains what we built, why it matters, the full technical architecture (concise but intentionally deep), how users see a minimal, fully abstracted UX, and how to add agentic design into transactions so flows can be delegated safely.

Table of contents
What is AlgoPay (quick)
Product highlights (for users)
Technical overview (for engineers & judges)
Architecture — components & responsibilities
Core flows (single-pay, pooled-pay, voucher, refund) — sequence diagrams
Agentic design — concept + concrete implementation patterns
Security, custody & compliance (what we did / production road map)
Developer quickstart (run locally / deploy)
API surface (important endpoints)
Testing, monitoring & audit
Accessibility commitments
Demo checklist (what to show judges)
Roadmap & stretch features
Contributing & contact
What is AlgoPay (quick)

AlgoPay is a PWA + backend prototype on Algorand TestNet that provides:

Creator dashboard to mint programmable QR-NFTs (product + rules).

Custodial app wallet (pooled hot wallet + off-chain ledger) for fast payments.

Single-pay and pooled-pay flows with atomic settlement (LogicSig + PyTeal app).

On-chain receipts or DB receipts with explorer links for provable provenance.

Accessibility-first UI and an agentic decision layer to automate routine transaction decisions safely.

We built the hard parts (settlement, rule verification, escrow safety) and hide them behind a simple, wallet-like mobile UX.

Product highlights (for users)

Scan a sticker → see product image, amount, and clear transaction summary.

One-tap confirm to pay from your AlgoPay balance.

Join group buys (pool) — multiple people contribute, one atomic settlement finalizes.

Claim NFT drops from QR metadata.

Receipts appear in your wallet with explorer links for auditability.

Accessibility modes: large text, high contrast, keyboard & screen-reader support.

Technical overview (for engineers & judges)

High-level layers

Presentation layer (PWA / Mobile-first)

React/Vite PWA, responsive, ARIA & keyboard-ready, QR camera + manual-code fallback.

Orchestration & API (Backend Node)

Express endpoints, pool manager, deposit watcher (indexer), transaction builder, signer service (pooled key), DB (SQLite for hackathon).

Transaction engine

reserve → commit → finalize pattern with DB two-phase commits and on-chain group broadcasting.

On-chain primitives

PyTeal stateful marketplace app (createListing, lock_payment, finalize, refund).

LogicSig escrow accounts that disburse only when grouped with valid app calls.

Indexing & provenance

Algorand Indexer + IPFS metadata (product images, tamper hashes) + receipts (ASA or DB).

Agentic layer (policy agents)

Autonomous decision agents that can approve, delay, or escalate transactions based on rules, scores, and risk models.

Security & custody

Pooled custodial account for demo (TestNet). Production: multisig + HSM + reconciliation & KYC.

Architecture — components & responsibilities
[Frontend PWA] <----HTTPS----> [Backend API / Orchestrator] <----> [Algorand Indexer / Algod]
       |                                     |
       |                                     +--> [Pooled Hot Wallet(s)] (signed by Signer service)
       |                                     |
       |                                     +--> [LogicSig Escrows] (per-listing)
       |                                     |
       |                                     +--> [PyTeal Marketplace App] (stateful)
       |
       +-- QR / NFT metadata (IPFS) ----> (stored & referenced)
       |
       +-- WebSocket / SSE (real-time tx updates)


Key internal services

Deposit watcher — polls indexer, credits DB balances on DEPOSIT:<userId> notes.

Pool manager — reserves balances, aggregates contributions, triggers settlement.

Transaction signer — server component that signs pooled account txns (demo: mnemonic in env; prod: HSM / multisig).

Agent manager — runs agents (policy evaluators) on events and can pre-authorize, delay, or require escalation.

Indexer reconciler — updates tx statuses and writes receipts.

Core flows (concise sequence diagrams)
Single-pay (buyer-funded from custodial balance)

User scans QR → Frontend GET /api/listing/:id.

Frontend POST /api/pay → Backend: reserve(userId, amount).

Backend commitPayment():

Build group: [PooledAccount -> Escrow], [AppCall lock(listingId)]

Sign group (pooled signer), broadcast.

Wait for confirmation → mark transaction committed in DB.

On verifier/courier signal: Backend POST finalize:

Group: [AppCall finalize], [Escrow -> Seller], [Item ASA transfer]

Broadcast; mint receipt; update dashboards.

Pool-pay (custodial simplified)

Creator creates pool (target or per-person splits). Backend stores poolID.

Participant A joins → Backend reserve(A, amount). Repeat for B, C.

Initiator finalizes → Backend sums reserved amounts, builds one settlement tx from pooled account to seller (or escrow + finalize group).

Broadcast; on confirm mint receipts to participants.

Offline-signed voucher (seller signs an authorization)

Seller signs {listingID, price, nonce, expiry} with seller key and gives blob to buyer.

Buyer later POST /api/redeem_voucher with voucher + payment.

Backend verifies signature and nonce unused; proceed to commitPayment or immediate finalize.

Agentic design — concept and concrete implementation

Definition (short): Agentic design lets software agents act on behalf of users (or the platform) by autonomously making decisions, composing transactions, and executing flows—subject to explicit policies, audits, and human-in-the-loop controls.

We add agency to transactions to:

Automate routine approvals (low-risk finalization).

Apply policy-driven risk checks (anti-fraud, KYC thresholds).

Enable delegated wallet behaviors (scheduled payments, auto-splits, reminders).

Provide programmable responders (auto-refund on courier failure).

Core agent patterns for AlgoPay
1) Policy Agent (declarative) — safe automation

What: Runs a set of declarative rules (policies) against an event (e.g., lock_payment occurred).

When to use: Auto-finalize low-risk buys (verifier score > threshold), or route medium-risk to manual review.

Implementation sketch:

Policy expressed in JSON:

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


Agent manager evaluates policies on events and returns approve|escalate|deny with reasoning stored in audit log.

2) Risk Scoring Agent (ML-like / heuristic)

What: Scores transactions on risk (fraud, chargeback probability) using behavioral features & heuristics.

Action: If score < threshold, auto-approve; else require manual arbitration.

Implementation: simple logistic model or rule ensemble; offline training optional. Store features in event logs for audit.

3) Delegated Wallet Agent (user-side policy)

What: Users define rules for their wallet (e.g., “auto-pay recurring coffee up to $5/day”, “allow pool-based spending while merchant is verified”).

Action: Agent signs or authorizes transactions within user-defined limits; logs all actions for user review.

Implementation: UI to create delegation policies; server issues signed short-lived tokens representing delegation; agent only acts under those tokens.

4) Workflow Agent (orchestrator)

What: Orchestrates multi-step flows (e.g., escrow release after courier webhook, insurance payout on lost items).

Action: Watches for required signals and submits grouped transactions in the correct order and grouping.

How the agent layer is integrated (architecture)

Agent Manager Service (backend) receives events: payment_locked, pool_funded, voucher_redeemed.

For each event: it calls evaluatePolicies(event) → returns decision + action plan.

The Orchestrator executes action plan (calls commitPayment, finalize, or queues manual review).

All agent decisions create immutable audit records: {eventId, policyIdsEvaluated, decision, rationale, actorId, timestamp}.

Human-in-loop: agents can push tasks to a moderator queue with context including suggested tx group and "Approve / Reject" buttons.

Safety & audit controls

Policy whitelists — only pre-approved policies can perform destructive actions like auto-finalize.

Rate & limit caps — agents have rate limits and monetary caps.

Explainability — agent returns human-readable rationale (which policy passed/failed).

Immutable logs — every agent action writes to DB + reference to on-chain txids.

Manual override & rollback — manual reversal flows audited and recorded.

Example agentic flow (auto-finalize)

payment_locked event arrives with metadata (amount, listingID, verifierId, deliveryMethod).

AgentManager loads policies & computes verifierScore = 0.85, amountUsd = 45.

Policy auto_finalize_low_risk matches → action finalizeTransaction.

Orchestrator builds finalize group, uses LogicSig check & pooled signer to broadcast.

Agent logs decision, emits user notification: “Your payment to X was auto-finalized by policy Y.”

Audit / replay available for judges and compliance.

Security, custody & compliance

Demo stance: custodial pooled hot wallet on TestNet — safe for a demo but NOT production-ready.

Production hardening (must do):

Use multi-sig (2-of-3) with HSM/KMS for signing.

Maintain hot/warm/cold split: only small operating balances in hot, rest in cold.

KYC/AML flow for deposits & withdrawals; integrate a vetted provider.

Rate limits, daily limits, withdrawal delays & manual review for high-value actions.

Continuous reconciliation: nightly audit between DB ledger and on-chain balances.

Monitoring & alarms for anomalous outgoing flows.

Legal counsel: custody license + compliance mapping to jurisdiction.

Security primitives used in the prototype

Atomic groups (two-step lock & finalize) protect against mid-flight loss.

LogicSig escrows that only disburse when grouped with correct appcall.

DB two-phase commit to prevent “double-spend” state inconsistencies.

Nonce and consumed flags for voucher flow to prevent replay.

Developer quickstart (run locally / deploy)

Prereqs

Node 16+, Python 3.9+, algosdk, pyteal, SQLite

TestNet Algod/Indexer (PureStake preferred), Pooled TestNet account mnemonic

Environment (.env example)

ALGOD_URL=https://testnet-algorand.api.purestake.io/ps2
ALGOD_TOKEN=YOUR_PURESTAKE_KEY
INDEXER_URL=https://testnet-algorand.api.purestake.io/idx2
INDEXER_TOKEN=YOUR_PURESTAKE_KEY
POOLED_MNEMONIC="testnet mnemonic here"
POOLED_ADDRESS="addr..."
MARKETPLACE_APP_ID=0  # update after deploy
FRONTEND_URL=http://localhost:5173
PORT=3000


Commands (dev)

# backend
cd backend
npm install
node backend/index.js

# run deposit watcher (separate terminal)
node backend/depositWatcher.js

# contracts (compile PyTeal)
python3 -m venv venv && source venv/bin/activate
pip install pyteal
python contracts/compile_marketplace.py  # helper script in repo

# frontend
cd frontend
npm install
npm run dev


Deploying contracts

Use pyteal compile -> teal files -> deploy via algosdk script scripts/deploy_marketplace.js which creates the app, returns APP_ID. Update .env.

API surface (important endpoints)

User & wallet

POST /api/createUser {userId,name}

GET /api/wallet/:userId/summary — balance, assets, NFTs, recent txs

GET /api/balance/:userId

Payments & pools

POST /api/pay {userId, listingID} — reserve & commit from custodial balance

POST /api/createPool {listingID, target, maxParticipants}

POST /api/joinPool {poolID, userId, amount}

POST /api/finalizePool {poolID}

Auth / agent

POST /api/authorizePayment {userId, payload, pin} — authorize with PIN (for confirm flows)

POST /api/agent/execute {eventId} — manually trigger agent re-eval

Admin / dev

POST /api/finalize {listingID} — admin finalize (simulated verifier)

GET /api/tx/:txid — status & explorer link

Testing, monitoring & audit

Unit & integration

Unit tests for: reserve -> commit -> reconcile flows, pool aggregation, voucher redeem, refund.

Integration test: run against Algorand TestNet or Sandbox — simulate deposit -> pay -> finalize.

Monitoring

Prometheus + Grafana for backend metrics: pending txs, failed broadcasts, agent decisions per minute.

Alerts: outgoing txs over threshold, failed confirmation > N minutes, indexer mismatch.

Audit

Immutable event logs: every decision, agent action, signed tx blob, and on-chain txid persisted (append-only).

Admin UI to replay a transaction and view policy rationale.

Accessibility commitments (short)

WCAG 2.1 AA target; keyboard nav; ARIA attributes; high-contrast & large-text modes; manual entry of sticker codes (non-visual fallback); screen-reader friendly flows.

Demo checklist (for judges)

 Deposit credited to app wallet via DEPOSIT:<userId> note (show DB & explorer tx).

 Create QR NFT via dashboard (show IPFS CID & NFT metadata).

 Single-pay: scan → pay → show lock grouped tx → finalize → show finalize tx & receipt.

 Multi-pay: create pool → two users join → finalize → single atomic settlement (show txid).

 Agent demo: auto-finalize under policy (show policy executed & audit log).

 Accessibility: toggle large-text mode & show scanning via manual code entry.

Roadmap & stretch features

Non-custodial wallet integration (Pera / WalletConnect) as an optional mode.

HSM + multisig production signing pipeline.

Insurance & micro-insurance pools.

Marketplace explorer & verifier marketplace (staked verifiers).

Agent marketplace: third-party agents (e.g., risk scoring vendors) as plug-ins.

Concluding note — make it feel simple, ship the complexity safely

AlgoPay intentionally hides complicated primitives (atomic groups, escrows, policies) behind a simple wallet-like UX. Under the hood: deterministic LogicSig escrows, PyTeal contracts, a robust backend orchestration and an agentic policy layer that lets you automate with accountability. For hackathon and early pilots, the custodial model and agentic policies let you deliver a magical user experience; for production we recommend the full custody hardening stack (multisig, HSM, KYC) plus ongoing reconciliation and legal review.

Contributing & contact

Repo: github.com/yourorg/algopay

Issues / PRs: follow CONTRIBUTING.md (branch: hackathon/demo)

Questions / demo requests: contact team@algopay.example

Accessibility feedback: enaihouwaspaul@gmail.com @oactodev. on Discord @tualg5 on Telegram, @EnaihoVFX on linkedin
---

## 🙏 Acknowledgments

- Algorand Foundation
- PyTeal Documentation
- AlgoSDK Team
- React Community

---

**Built with ❤️ for Algorand**  
**October 2025**
