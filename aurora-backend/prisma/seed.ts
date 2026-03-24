import 'dotenv/config'; // Ensure environment variables are loaded
import { PrismaClient, TxType, TxStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Prisma 7 explicitly requires a driver adapter
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Clearing old data...');
  await prisma.transaction.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding Institutional Profile...');

  // Create our test user with nested assets and transactions!
  const user = await prisma.user.create({
    data: {
      email: 'trader@aurora.io',
      fullName: 'Institutional Active',
      passwordHash: 'hashed_password_placeholder',
      usdBalance: 1420552.0,

      // 1. Injecting Crypto Wallets (Assets)
      assets: {
        create: [
          { symbol: 'BTC', amount: 12.4402 },
          { symbol: 'ETH', amount: 24.812 },
          { symbol: 'SOL', amount: 1240.5 },
        ],
      },

      // 2. Injecting Ledger History (Transactions)
      transactions: {
        create: [
          {
            type: TxType.DEPOSIT,
            assetSymbol: 'USD',
            amount: 250000.0,
            priceAtTime: 1.0,
            fee: 0,
            status: TxStatus.COMPLETED,
          },
          {
            type: TxType.BUY,
            assetSymbol: 'BTC',
            amount: 1.24021,
            priceAtTime: 64281.45,
            fee: 12.45,
            status: TxStatus.COMPLETED,
          },
          {
            type: TxType.SELL,
            assetSymbol: 'ETH',
            amount: 42.5,
            priceAtTime: 3412.55,
            fee: 15.42,
            status: TxStatus.COMPLETED,
          },
        ],
      },
    },
  });

  console.log(`✅ Successfully seeded database for user: ${user.email}`);
  console.log(`🔥 IMPORTANT! Copy this User ID for Angular: ${user.id}`); // <-- ADD THIS
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
