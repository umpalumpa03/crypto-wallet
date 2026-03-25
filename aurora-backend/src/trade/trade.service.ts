import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TxType, TxStatus } from '@prisma/client';

@Injectable()
export class TradeService {
  constructor(private prisma: PrismaService) {}

  public async getPortfolio(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { assets: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const cryptoMap: Record<string, number> = {};
    for (const asset of user.assets) {
      cryptoMap[asset.symbol] = asset.amount;
    }

    return {
      usdBalance: user.usdBalance,
      cryptoPortfolio: cryptoMap,
    };
  }

  public async executeTrade(
    userId: string,
    side: TxType,
    symbol: string,
    amount: number,
    price: number,
  ) {
    const totalValue = amount * price;

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      const assetWallet = await tx.asset.findUnique({
        where: { userId_symbol: { userId, symbol } },
      });

      if (!user) throw new BadRequestException('User not found');

      if (side === TxType.BUY) {
        if (user.usdBalance < totalValue) {
          throw new BadRequestException('Insufficient USD balance');
        }

        await tx.user.update({
          where: { id: userId },
          data: { usdBalance: { decrement: totalValue } },
        });

        await tx.asset.upsert({
          where: { userId_symbol: { userId, symbol } },
          update: { 
            amount: { increment: amount },
            totalCost: { increment: totalValue } // 🏦 Update cost basis
          },
          create: { userId, symbol, amount, totalCost: totalValue },
        });
      } else if (side === TxType.SELL) {
        const currentAmount = assetWallet?.amount || 0;
        const currentTotalCost = assetWallet?.totalCost || 0;

        if (currentAmount < amount) {
          throw new BadRequestException(`Insufficient ${symbol} balance`);
        }

        // Calculate proportional cost basis removal
        const proportionalCost = (amount / currentAmount) * currentTotalCost;

        await tx.user.update({
          where: { id: userId },
          data: { usdBalance: { increment: totalValue } },
        });

        await tx.asset.update({
          where: { userId_symbol: { userId, symbol } },
          data: { 
            amount: { decrement: amount },
            totalCost: { decrement: proportionalCost } // 📉 Reduce basis proportionally
          },
        });
      }

      await tx.transaction.create({
        data: {
          userId,
          type: side,
          assetSymbol: symbol,
          amount: amount,
          priceAtTime: price,
          fee: 0.0,
          status: TxStatus.COMPLETED,
        },
      });
    });

    return this.getPortfolio(userId);
  }

  public async getTransactionHistory(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  public async getDepositConfigs() {
    return {
      BTC: {
        name: 'Bitcoin',
        symbol: 'BTC',
        network: 'SegWit',
        icon: 'currency_bitcoin',
        iconClass: 'text-primary-fixed-dim',
        address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        warning:
          'Only send Bitcoin (BTC) to this address. Sending any other asset may result in permanent loss.',
      },
      ETH: {
        name: 'Ethereum',
        symbol: 'ETH',
        network: 'ERC-20',
        icon: 'diamond',
        iconClass: 'text-secondary',
        address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        warning:
          'Only send Ethereum (ETH) or ERC-20 tokens via the Ethereum network to this address.',
      },
      SOL: {
        name: 'Solana',
        symbol: 'SOL',
        network: 'Solana',
        icon: 'token',
        iconClass: 'text-tertiary-fixed-dim',
        address: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
        warning:
          'Only send Solana (SOL) or SPL tokens to this address. Do not send NFTs to this vault.',
      },
      USD: {
        name: 'US Dollar',
        symbol: 'USD',
        network: 'Wire Transfer',
        icon: 'account_balance',
        iconClass: 'text-white',
        address: 'Acct: 38291048 | Routing: 122105155',
        warning:
          'Ensure the sender name perfectly matches your verified KYC identity. Institutional wires only.',
      },
    };
  }
}
