import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PortfolioModule } from './portfolio/portfolio.module';
import { MarketGateway } from './market/market.gateway';
import { PrismaModule } from './prisma/prisma.module';
import { TradeModule } from './trade/trade.module';
import { AuthModule } from './auth/auth.module';
import { OrderBookGateway } from './trade/order-book.gateway';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    PortfolioModule, 
    PrismaModule, 
    TradeModule, 
    AuthModule
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    MarketGateway,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    }
  ],
})
export class AppModule {}
