import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TxType, TxStatus } from '@prisma/client';

@Injectable()
export class TradeService {
  constructor(private prisma: PrismaService) {}

  async getPortfolio(userId: string) {
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

  async executeTrade(
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
          update: { amount: { increment: amount } },
          create: { userId, symbol, amount },
        });
      } else if (side === TxType.SELL) {
        const currentAmount = assetWallet?.amount || 0;

        if (currentAmount < amount) {
          throw new BadRequestException(`Insufficient ${symbol} balance`);
        }

        await tx.user.update({
          where: { id: userId },
          data: { usdBalance: { increment: totalValue } },
        });

        await tx.asset.update({
          where: { userId_symbol: { userId, symbol } },
          data: { amount: { decrement: amount } },
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

  async getTransactionHistory(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
