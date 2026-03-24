import { Module } from '@nestjs/common';
import { TradeController } from './trade.controller';
import { TradeService } from './trade.service';
import { OrderBookGateway } from './order-book.gateway';

@Module({
  controllers: [TradeController],
  providers: [TradeService, OrderBookGateway],
})
export class TradeModule {}
