#!/usr/bin/env node

import { execSync } from 'child_process';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure migrations directory exists
const migrationsDir = path.join(__dirname, '..', 'migrations');
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

// Run the drizzle-kit command
console.log('📦 Running database migration...');

try {
  // Generate migration files
  console.log('📝 Generating migration SQL...');
  execSync('npx drizzle-kit generate:pg', { stdio: 'inherit' });
  
  // Create a script to push migrations
  const pushScriptPath = path.join(__dirname, 'push-schema.ts');
  fs.writeFileSync(
    pushScriptPath,
    `
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';
import ws from 'ws';
import pg from 'pg';

// Configure Neon to use ws for WebSocket
neonConfig.webSocketConstructor = ws;

// For direct SQL queries
async function setupDatabase() {
  console.log('🚀 Pushing schema to database...');
  
  try {
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL
    });

    await client.connect();
    console.log('📊 Connected to database');

    // Create users table
    await client.query(\`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'seller',
        subscription TEXT NOT NULL DEFAULT 'basic',
        subscription_valid_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    \`);
    console.log('✅ Created users table');

    // Create inventory_items table
    await client.query(\`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        store_id INTEGER,
        sku TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        subcategory TEXT,
        condition TEXT NOT NULL,
        price REAL NOT NULL,
        cost REAL,
        quantity INTEGER NOT NULL DEFAULT 1,
        image_urls TEXT[],
        thumbnail_url TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        ai_generated BOOLEAN DEFAULT FALSE,
        ai_data JSONB,
        marketplace_data JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    \`);
    console.log('✅ Created inventory_items table');

    // Create marketplaces table
    await client.query(\`
      CREATE TABLE IF NOT EXISTS marketplaces (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        shop_url TEXT,
        is_connected BOOLEAN NOT NULL DEFAULT FALSE,
        access_token TEXT,
        refresh_token TEXT,
        expires_at TIMESTAMP,
        last_synced_at TIMESTAMP,
        active_listings INTEGER DEFAULT 0,
        settings JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    \`);
    console.log('✅ Created marketplaces table');

    // Create stores table
    await client.query(\`
      CREATE TABLE IF NOT EXISTS stores (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        owner_id INTEGER NOT NULL,
        manager_id INTEGER,
        description TEXT,
        commission_rate REAL DEFAULT 0,
        platform_fee_rate REAL DEFAULT 0.03,
        payment_settings JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    \`);
    console.log('✅ Created stores table');

    // Create sales table
    await client.query(\`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        inventory_item_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        store_id INTEGER,
        marketplace TEXT,
        sale_amount REAL NOT NULL,
        commission_amount REAL,
        platform_fee_amount REAL,
        sale_date TIMESTAMP DEFAULT NOW() NOT NULL,
        buyer_info JSONB,
        status TEXT NOT NULL DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    \`);
    console.log('✅ Created sales table');

    // Create donations table
    await client.query(\`
      CREATE TABLE IF NOT EXISTS donations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        inventory_item_id INTEGER NOT NULL,
        donation_value REAL NOT NULL,
        donation_date TIMESTAMP DEFAULT NOW() NOT NULL,
        organization TEXT,
        tax_deduction_rate REAL,
        receipt_info JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    \`);
    console.log('✅ Created donations table');

    // Create image_analysis table
    await client.query(\`
      CREATE TABLE IF NOT EXISTS image_analysis (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        original_image_url TEXT NOT NULL,
        processed_image_url TEXT,
        detected_item TEXT,
        suggested_title TEXT,
        suggested_description TEXT,
        suggested_category TEXT,
        suggested_condition TEXT,
        suggested_price REAL,
        market_price_range JSONB,
        ai_data JSONB,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    \`);
    console.log('✅ Created image_analysis table');

    // Create subscriptions table
    await client.query(\`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        plan TEXT NOT NULL,
        status TEXT NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    \`);
    console.log('✅ Created subscriptions table');

    // Create analytics table
    await client.query(\`
      CREATE TABLE IF NOT EXISTS analytics (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        date TIMESTAMP NOT NULL,
        total_inventory INTEGER,
        active_listings INTEGER,
        total_sales REAL,
        total_commissions REAL,
        platform_fees REAL,
        marketplace_data JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    \`);
    console.log('✅ Created analytics table');

    // Create session table for connect-pg-simple
    await client.query(\`
      CREATE TABLE IF NOT EXISTS session (
        sid VARCHAR NOT NULL PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      )
    \`);
    console.log('✅ Created session table');

    // Create index on session expire
    await client.query(\`
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire)
    \`);
    console.log('✅ Created session expire index');

    console.log('✅ All tables created successfully');
    
    await client.end();
  } catch (error) {
    console.error('❌ Error during setup:', error);
    process.exit(1);
  }
}

setupDatabase();
`
  );
  
  // Execute the push script
  console.log('🔨 Executing migration...');
  execSync('tsx scripts/push-schema.ts', { stdio: 'inherit' });
  
  // Clean up
  fs.unlinkSync(pushScriptPath);
  
  console.log('✅ Database migration completed successfully');
} catch (error) {
  console.error('❌ Error during migration:', error.toString());
  process.exit(1);
}