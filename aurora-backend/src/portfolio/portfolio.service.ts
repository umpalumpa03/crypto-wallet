import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData() {
    const userEmail = 'trader@aurora.io';

    const user = await this.prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        assets: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Institutional profile not found');
    }

    return user;
  }
}