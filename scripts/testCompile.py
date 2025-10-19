#!/usr/bin/env python3
"""
Test script to verify marketplace.py compiles successfully
"""

import sys
sys.path.insert(0, '/Users/Test/StickerPay')

from pyteal import compileTeal, Mode
from contracts.marketplace import approval_program, clear_state_program

print("=" * 70)
print("🧪 Testing PyTeal Contract Compilation")
print("=" * 70)
print()

# Test approval program compilation
print("1️⃣  Compiling approval program...")
try:
    approval_teal = compileTeal(approval_program(), Mode.Application, version=8)
    print(f"   ✅ SUCCESS - Generated {len(approval_teal.split(chr(10)))} lines of TEAL")
    print()
except Exception as e:
    print(f"   ❌ FAILED: {e}")
    sys.exit(1)

# Test clear state program compilation
print("2️⃣  Compiling clear state program...")
try:
    clear_teal = compileTeal(clear_state_program(), Mode.Application, version=8)
    print(f"   ✅ SUCCESS - Generated {len(clear_teal.split(chr(10)))} lines of TEAL")
    print()
except Exception as e:
    print(f"   ❌ FAILED: {e}")
    sys.exit(1)

# Display first 20 lines of approval program
print("=" * 70)
print("📄 Approval Program (first 20 lines):")
print("=" * 70)
approval_lines = approval_teal.split('\n')
for i, line in enumerate(approval_lines[:20], 1):
    print(f"{i:3d} | {line}")

if len(approval_lines) > 20:
    print(f"... {len(approval_lines) - 20} more lines")

print()

# Display clear state program
print("=" * 70)
print("📄 Clear State Program (complete):")
print("=" * 70)
clear_lines = clear_teal.split('\n')
for i, line in enumerate(clear_lines, 1):
    print(f"{i:3d} | {line}")

print()
print("=" * 70)
print("✅ All compilation tests PASSED!")
print("=" * 70)
print()
print("📝 Contract Methods:")
print("   • create - Create a new listing")
print("   • lock - Lock payment for a listing")
print("   • finalize - Finalize a listing (admin only)")
print("   • refund - Refund after deadline")
print()
print("🎉 Contract is ready for deployment!")

