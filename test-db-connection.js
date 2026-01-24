#!/usr/bin/env node
/**
 * Test database connection to Neon
 * Run with: node test-db-connection.js
 */

import { PrismaClient } from '@prisma/client'

async function testConnection() {
  console.log('🔍 Testing database connection...\n')

  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  })

  try {
    // Try to connect to the database
    await prisma.$connect()
    console.log('✅ Database connection successful!\n')

    // Try to query the database
    const userCount = await prisma.user.count()
    console.log(`📊 Database stats:`)
    console.log(`   - Users: ${userCount}`)

    const recordCount = await prisma.userRecord.count()
    console.log(`   - Records: ${recordCount}`)

    const shelfCount = await prisma.shelf.count()
    console.log(`   - Shelves: ${shelfCount}`)

    const setlistCount = await prisma.setlist.count()
    console.log(`   - Setlists: ${setlistCount}`)

    console.log('\n✨ Everything looks good!')

  } catch (error) {
    console.error('❌ Database connection failed!\n')
    console.error('Error:', error.message)
    console.error('\n💡 Troubleshooting:')
    console.error('   1. Check that DATABASE_URL is set in .env')
    console.error('   2. Verify the connection string is correct')
    console.error('   3. Make sure your Neon project is active')
    console.error('   4. Run: npx prisma migrate deploy')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
