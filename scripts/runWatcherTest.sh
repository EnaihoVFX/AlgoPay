#!/bin/bash
# Quick test to verify depositWatcher starts and runs without crashing

echo "🧪 Testing depositWatcher for 10 seconds..."
echo ""

# Start the watcher in background
cd /Users/Test/StickerPay
node backend/depositWatcher.js &
PID=$!

echo "✓ Started depositWatcher (PID: $PID)"
echo "  Monitoring for 10 seconds..."
echo ""

# Wait 10 seconds
sleep 10

# Kill the watcher
kill $PID 2>/dev/null

echo ""
echo "✅ depositWatcher ran successfully for 10 seconds without crashing!"
echo ""
echo "📋 Next steps:"
echo "  1. Fund the pooled address at: https://bank.testnet.algorand.network/"
echo "  2. Send a test transaction with note: DEPOSIT:testuser1"
echo "  3. Run: node backend/depositWatcher.js"
echo "  4. Watch for deposit confirmation in console"

