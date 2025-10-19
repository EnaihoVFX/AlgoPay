# 🚀 NFT Quick Start Guide

Get started with creating and claiming NFTs in 5 minutes!

---

## ⚡ Quick Setup

### 1. Start the Backend

```bash
cd backend
node index.js
```

You should see the NFT endpoints listed in the startup message.

### 2. Start the Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

### 3. Ensure Your Wallet is Funded

Your pooled wallet needs ALGO for transaction fees.

**Get free TestNet ALGO:**
```
Visit: https://bank.testnet.algorand.network/
Paste address: 54Z4UQNPKFOL2LB3YTQ23SDNOMPUIUPM3WKDN3AHH2KXUCVN6WXZKYC4EI
(or your custom address from .env)
Request ALGO (it's free!)
```

---

## 🎨 Create Your First NFT

### Option 1: Web Interface (Easiest!)

1. **Open the app**: http://localhost:5173
2. **Click "NFT" button** on the home screen
3. **Fill out the form**:
   - Name: `My First NFT`
   - Unit: `FIRST` (optional)
   - Description: `Created with StickerPay!`
   - Image: (optional) `https://picsum.photos/400`
4. **Click "Create NFT"**
5. **Done!** QR code is generated automatically

### Option 2: Command Line

```bash
node scripts/mintClaimableNFT.js \
  --name "My First NFT" \
  --unit "FIRST" \
  --description "Created with StickerPay!" \
  --image "https://picsum.photos/400"
```

---

## 🎫 Claim an NFT

### 1. Get a Claimable NFT

- Use the NFT you just created above
- Or have someone create one and share the QR code with you

### 2. Open Scanner

- Click "Scan" on the home screen
- Or visit: http://localhost:5173/pay

### 3. Scan the QR Code

- Point your camera at the QR code
- Or manually enter the claim URL

### 4. Confirm & Claim

- Review the NFT details
- Click "Confirm Payment" button
- Wait ~4 seconds for blockchain confirmation
- **You now own the NFT!**

---

## 🧪 Test the Full Flow

Here's a complete end-to-end test:

```bash
# Terminal 1: Start backend
cd backend
node index.js

# Terminal 2: Start frontend
cd frontend
npm run dev

# Terminal 3: Create test NFT via CLI
node scripts/mintClaimableNFT.js \
  --name "Test NFT #1" \
  --unit "TEST1" \
  --description "Testing the system"
```

The CLI will output:
- Asset ID
- Claim Code
- QR Code URL

Then:
1. Open the claim URL in your browser
2. Scan with the app's scanner
3. Claim the NFT!

---

## 📱 User Flow Demo

### As a Creator:

```
1. Open StickerPay
2. Click "NFT" button
3. Fill in NFT details
4. Click "Create NFT"
5. Download QR code
6. Share QR code (print, email, social media, etc.)
```

### As a Claimant:

```
1. Receive QR code (scan physically or click link)
2. Open StickerPay scanner
3. Scan QR code
4. Review NFT details
5. Click "Confirm"
6. NFT is yours!
```

---

## 🎯 Quick Examples

### Example 1: Event Ticket

```javascript
// Via API
fetch('http://localhost:3000/api/nft/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "AlgoCon 2025 VIP Pass",
    unitName: "ACVIP",
    description: "All-access VIP ticket to AlgoCon 2025",
    imageUrl: "https://example.com/ticket.png",
    creatorUserId: "testuser1"
  })
})
```

### Example 2: Digital Art

```bash
node scripts/mintClaimableNFT.js \
  --name "Sunset Dreams #42" \
  --unit "SUNSET" \
  --description "Limited edition digital art" \
  --image "ipfs://QmYourIPFSHash"
```

### Example 3: Collectible Card

```bash
node scripts/mintClaimableNFT.js \
  --name "Trading Card - Legendary Dragon" \
  --unit "DRAGON" \
  --description "Rare legendary dragon card" \
  --image "https://mycdn.com/dragon.png"
```

---

## 🔍 Verify Your NFT

After creating an NFT, verify it on-chain:

1. **Copy the Asset ID** from the success screen
2. **Visit TestNet Explorer**: https://testnet.algoexplorer.io/
3. **Search for your Asset ID**
4. **View details**: name, creator, metadata, etc.

Or use the direct link from the app!

---

## 📊 Check NFT Status

### Via Web Interface:

Coming soon! Dashboard to see:
- NFTs you've created
- NFTs you've claimed
- Unclaimed NFTs

### Via API:

```bash
# Your created NFTs
curl http://localhost:3000/api/nft/created/testuser1

# Your claimed NFTs
curl http://localhost:3000/api/nft/claimed/testuser1

# All unclaimed NFTs
curl http://localhost:3000/api/nft/unclaimed
```

---

## 🐛 Common Issues

### "POOLED_MNEMONIC not configured"

**Fix:** Add to `.env`:
```
POOLED_MNEMONIC="your 25 word mnemonic phrase here"
```

### "Insufficient balance"

**Fix:** Fund your wallet with TestNet ALGO:
https://bank.testnet.algorand.network/

### "Recipient must opt-in"

This happens when claiming to a new address. The app handles this automatically for pooled wallets.

### "NFT already claimed"

This NFT was already claimed by someone else. Each NFT can only be claimed once!

---

## 🎓 Next Steps

Now that you've created and claimed your first NFT:

1. **Read the full guide**: `NFT_GUIDE.md`
2. **Create a collection**: Mint multiple related NFTs
3. **Customize images**: Use IPFS for permanent hosting
4. **Share widely**: Print QR codes, add to websites, etc.
5. **Build on top**: Integrate into your own app!

---

## 💡 Use Case Ideas

- **Event Tickets**: Create QR code tickets for events
- **Loyalty Programs**: Reward customers with NFTs
- **Digital Art**: Share your creations
- **Proof of Attendance**: POAP-style NFTs
- **Access Passes**: Gate content/features with NFT ownership
- **Collectibles**: Limited edition series
- **Certificates**: Educational or achievement certificates
- **Gaming Items**: In-game items as NFTs

---

## 🆘 Need Help?

- Check `NFT_GUIDE.md` for detailed docs
- Review backend logs: `node backend/index.js`
- Check database: `sqlite3 backend/data.sqlite`
- View on Explorer: https://testnet.algoexplorer.io/

---

## 🎉 You're Ready!

You now know how to:
- ✅ Create NFTs with custom metadata
- ✅ Generate QR codes for sharing
- ✅ Claim NFTs via scanner
- ✅ Verify on blockchain

**Go create something awesome! 🚀**

---

**Built with ❤️ on Algorand**  
**October 2025**

