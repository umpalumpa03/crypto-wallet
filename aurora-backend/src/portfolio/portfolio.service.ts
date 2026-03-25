import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  public async getDashboardData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        assets: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Institutional profile not found');
    }

    
    return user;
  }
}