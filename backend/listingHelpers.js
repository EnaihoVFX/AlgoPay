/**
 * listingHelpers.js
 * 
 * Real listing database (no mock data)
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.sqlite');
const db = new Database(DB_PATH);

// Initialize listings table
function initializeListingsTable() {
  console.log('Initializing listings table...');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      image TEXT,
      sellerAddress TEXT NOT NULL,
      escrowAddress TEXT NOT NULL,
      status TEXT DEFAULT 'listed',
      rules TEXT,
      deadline INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('✓ Listings table ready');
}

initializeListingsTable();

// Create listing
function createListing({ id, title, description, price, sellerAddress, escrowAddress, image, rules, deadline }) {
  try {
    const stmt = db.prepare(`
      INSERT INTO listings (id, title, description, price, sellerAddress, escrowAddress, image, rules, deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Ensure deadline is an integer
    const deadlineInt = deadline ? parseInt(deadline) : Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
    
    stmt.run(id, title, description || '', parseInt(price), sellerAddress, escrowAddress, image || '', rules || '', deadlineInt);
    
    console.log(`✓ Created listing: ${id}`);
    return getListing(id);
  } catch (err) {
    console.error('Error creating listing:', err.message);
    throw err;
  }
}

// Get listing
function getListing(id) {
  try {
    const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(id);
    return listing || null;
  } catch (err) {
    console.error('Error getting listing:', err.message);
    throw err;
  }
}

// Update listing status
function updateListingStatus(id, status) {
  try {
    db.prepare('UPDATE listings SET status = ? WHERE id = ?').run(status, id);
    console.log(`✓ Updated listing ${id} status to ${status}`);
  } catch (err) {
    console.error('Error updating listing:', err.message);
    throw err;
  }
}

// Get all listings
function getAllListings() {
  try {
    return db.prepare('SELECT * FROM listings ORDER BY created_at DESC').all();
  } catch (err) {
    console.error('Error getting all listings:', err.message);
    throw err;
  }
}

module.exports = {
  createListing,
  getListing,
  updateListingStatus,
  getAllListings
};

