"""
Marketplace Smart Contract - PyTeal Implementation

This contract implements a simple stateful marketplace for managing listings.

COMPILATION:
------------
To compile this PyTeal contract to TEAL:

    python3 contracts/marketplace.py > contracts/marketplace_approval.teal
    
Or programmatically:

    from pyteal import compileTeal, Mode
    from contracts.marketplace import approval_program, clear_state_program
    
    # Compile approval program
    approval_teal = compileTeal(approval_program(), Mode.Application, version=8)
    with open('contracts/marketplace_approval.teal', 'w') as f:
        f.write(approval_teal)
    
    # Compile clear state program
    clear_teal = compileTeal(clear_state_program(), Mode.Application, version=8)
    with open('contracts/marketplace_clear.teal', 'w') as f:
        f.write(clear_teal)

DEPLOYMENT:
-----------
Using goal CLI:

    # Create application
    goal app create --creator <CREATOR_ADDR> \
      --approval-prog contracts/marketplace_approval.teal \
      --clear-prog contracts/marketplace_clear.teal \
      --global-byteslices 10 --global-ints 10 \
      --local-byteslices 5 --local-ints 5

Using algosdk (Python):

    from algosdk import transaction
    from algosdk.v2client import algod
    
    # Read compiled TEAL
    with open('contracts/marketplace_approval.teal', 'r') as f:
        approval_program = f.read()
    with open('contracts/marketplace_clear.teal', 'r') as f:
        clear_program = f.read()
    
    # Compile programs
    approval_result = algod_client.compile(approval_program)
    clear_result = algod_client.compile(clear_program)
    
    # Create transaction
    txn = transaction.ApplicationCreateTxn(
        sender=creator_address,
        sp=params,
        on_complete=transaction.OnComplete.NoOpOC,
        approval_program=base64.b64decode(approval_result['result']),
        clear_program=base64.b64decode(clear_result['result']),
        global_schema=transaction.StateSchema(num_uints=10, num_byte_slices=10),
        local_schema=transaction.StateSchema(num_uints=5, num_byte_slices=5)
    )

USAGE:
------
Methods (passed as first application argument):
- "create" - Create a new listing
- "lock" - Lock payment for a listing
- "finalize" - Finalize a listing (admin only)
- "refund" - Refund a listing after deadline

Global State:
- "Admin" (bytes) - Administrator address

Listing State (per listingID):
- "{listingID}_price" (uint) - Listing price
- "{listingID}_seller" (bytes) - Seller address
- "{listingID}_deadline" (uint) - Deadline timestamp
- "{listingID}_status" (bytes) - Status: "listed", "locked", "finalized", "refunded"

Local State (per buyer):
- "listing_{listingID}" (bytes) - Listing ID the user is involved with
- "buyer_locked" (uint) - Whether buyer has locked payment
"""

from pyteal import *

# ============================================================================
# Global State Keys
# ============================================================================

ADMIN_KEY = Bytes("Admin")

# ============================================================================
# Listing State Keys (concatenated with listingID)
# ============================================================================

def listing_price_key(listing_id):
    """Key for listing price"""
    return Concat(listing_id, Bytes("_price"))

def listing_seller_key(listing_id):
    """Key for listing seller"""
    return Concat(listing_id, Bytes("_seller"))

def listing_deadline_key(listing_id):
    """Key for listing deadline"""
    return Concat(listing_id, Bytes("_deadline"))

def listing_status_key(listing_id):
    """Key for listing status"""
    return Concat(listing_id, Bytes("_status"))

def listing_buyer_key(listing_id):
    """Key for listing buyer"""
    return Concat(listing_id, Bytes("_buyer"))

# ============================================================================
# Helper Functions
# ============================================================================

def is_admin():
    """Check if sender is admin"""
    return Txn.sender() == App.globalGet(ADMIN_KEY)

def listing_exists(listing_id):
    """Check if listing exists"""
    return App.globalGet(listing_status_key(listing_id)) != Bytes("")

def get_listing_status(listing_id):
    """Get listing status"""
    return App.globalGet(listing_status_key(listing_id))

# ============================================================================
# Create Listing Method
# ============================================================================

def create_listing():
    """
    Create a new listing
    Args:
        Txn.application_args[0] = "create"
        Txn.application_args[1] = listingID (bytes)
        Txn.application_args[2] = price (uint64)
        Txn.application_args[3] = sellerAddr (bytes/address)
        Txn.application_args[4] = deadline_ts (uint64)
    """
    listing_id = Txn.application_args[1]
    price = Btoi(Txn.application_args[2])
    seller = Txn.application_args[3]
    deadline = Btoi(Txn.application_args[4])
    
    return Seq([
        # Assert listing doesn't already exist
        Assert(Not(listing_exists(listing_id))),
        
        # Assert price is positive
        Assert(price > Int(0)),
        
        # Assert deadline is in the future
        Assert(deadline > Global.latest_timestamp()),
        
        # Store listing details in global state
        App.globalPut(listing_price_key(listing_id), price),
        App.globalPut(listing_seller_key(listing_id), seller),
        App.globalPut(listing_deadline_key(listing_id), deadline),
        App.globalPut(listing_status_key(listing_id), Bytes("listed")),
        
        Approve()
    ])

# ============================================================================
# Lock Listing Method
# ============================================================================

def lock_listing():
    """
    Lock a listing with payment
    Args:
        Txn.application_args[0] = "lock"
        Txn.application_args[1] = listingID (bytes)
    """
    listing_id = Txn.application_args[1]
    
    return Seq([
        # Assert listing exists
        Assert(listing_exists(listing_id)),
        
        # Assert listing status is "listed"
        Assert(get_listing_status(listing_id) == Bytes("listed")),
        
        # Assert deadline hasn't passed
        Assert(Global.latest_timestamp() < App.globalGet(listing_deadline_key(listing_id))),
        
        # Assert sender is not the seller
        Assert(Txn.sender() != App.globalGet(listing_seller_key(listing_id))),
        
        # Store buyer address
        App.globalPut(listing_buyer_key(listing_id), Txn.sender()),
        
        # Update status to "locked"
        App.globalPut(listing_status_key(listing_id), Bytes("locked")),
        
        # Store in buyer's local state (opt-in required)
        App.localPut(Txn.sender(), Concat(Bytes("listing_"), listing_id), listing_id),
        App.localPut(Txn.sender(), Bytes("buyer_locked"), Int(1)),
        
        Approve()
    ])

# ============================================================================
# Finalize Listing Method
# ============================================================================

def finalize_listing():
    """
    Finalize a listing (admin only)
    Args:
        Txn.application_args[0] = "finalize"
        Txn.application_args[1] = listingID (bytes)
    """
    listing_id = Txn.application_args[1]
    
    return Seq([
        # Assert sender is admin
        Assert(is_admin()),
        
        # Assert listing exists
        Assert(listing_exists(listing_id)),
        
        # Assert listing is locked
        Assert(get_listing_status(listing_id) == Bytes("locked")),
        
        # Update status to "finalized"
        App.globalPut(listing_status_key(listing_id), Bytes("finalized")),
        
        Approve()
    ])

# ============================================================================
# Refund Listing Method
# ============================================================================

def refund_listing():
    """
    Refund a listing after deadline
    Args:
        Txn.application_args[0] = "refund"
        Txn.application_args[1] = listingID (bytes)
    """
    listing_id = Txn.application_args[1]
    
    return Seq([
        # Assert listing exists
        Assert(listing_exists(listing_id)),
        
        # Assert listing is locked
        Assert(get_listing_status(listing_id) == Bytes("locked")),
        
        # Assert sender is the buyer
        Assert(Txn.sender() == App.globalGet(listing_buyer_key(listing_id))),
        
        # Assert deadline has passed
        Assert(Global.latest_timestamp() >= App.globalGet(listing_deadline_key(listing_id))),
        
        # Update status to "refunded"
        App.globalPut(listing_status_key(listing_id), Bytes("refunded")),
        
        # Clear buyer's local state
        App.localPut(Txn.sender(), Bytes("buyer_locked"), Int(0)),
        
        Approve()
    ])

# ============================================================================
# Approval Program
# ============================================================================

def approval_program():
    """Main approval program logic"""
    
    # Handle application creation
    on_creation = Seq([
        # Set the creator as admin
        App.globalPut(ADMIN_KEY, Txn.sender()),
        Approve()
    ])
    
    # Handle opt-in (allow users to opt-in for local state)
    on_opt_in = Approve()
    
    # Handle close-out
    on_close_out = Approve()
    
    # Handle update (admin only)
    on_update = Seq([
        Assert(is_admin()),
        Approve()
    ])
    
    # Handle delete (admin only)
    on_delete = Seq([
        Assert(is_admin()),
        Approve()
    ])
    
    # Route application calls based on first argument
    method = Txn.application_args[0]
    
    on_call = Cond(
        [method == Bytes("create"), create_listing()],
        [method == Bytes("lock"), lock_listing()],
        [method == Bytes("finalize"), finalize_listing()],
        [method == Bytes("refund"), refund_listing()]
    )
    
    # Main program routing
    program = Cond(
        [Txn.application_id() == Int(0), on_creation],
        [Txn.on_completion() == OnComplete.OptIn, on_opt_in],
        [Txn.on_completion() == OnComplete.CloseOut, on_close_out],
        [Txn.on_completion() == OnComplete.UpdateApplication, on_update],
        [Txn.on_completion() == OnComplete.DeleteApplication, on_delete],
        [Txn.on_completion() == OnComplete.NoOp, on_call]
    )
    
    return program

# ============================================================================
# Clear State Program
# ============================================================================

def clear_state_program():
    """Clear state program - always approves"""
    return Approve()

# ============================================================================
# Compilation (for direct execution)
# ============================================================================

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "clear":
        # Compile clear state program
        print(compileTeal(clear_state_program(), Mode.Application, version=8))
    else:
        # Compile approval program
        print(compileTeal(approval_program(), Mode.Application, version=8))

