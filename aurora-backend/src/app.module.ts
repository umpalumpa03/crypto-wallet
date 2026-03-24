import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { PortfolioModule } from './portfolio/portfolio.module';
import { MarketGateway } from './market/market.gateway';
import { PrismaModule } from './prisma/prisma.module';
import { TradeModule } from './trade/trade.module';

@Module({
  imports: [PortfolioModule, PrismaModule, TradeModule],
  controllers: [AppController],
  providers: [AppService, PrismaService, MarketGateway],
})
export class AppModule {}
