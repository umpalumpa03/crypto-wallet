import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { TradeService } from './trade.service';
import { ExecuteTradeDto } from './dto/execute-trade.dto';

@Controller('api/trade')
export class TradeController {
  constructor(private readonly tradeService: TradeService) {}

  @Get('portfolio/:userId')
  async getPortfolio(@Param('userId') userId: string) {
    return this.tradeService.getPortfolio(userId);
  }

  @Post('execute')
  async executeTrade(@Body() dto: ExecuteTradeDto) {
    return this.tradeService.executeTrade(
      dto.userId,
      dto.side,
      dto.asset,
      dto.amount,
      dto.executionPrice,
    );
  }

  @Get('history/:userId')
  async getHistory(@Param('userId') userId: string) {
    return this.tradeService.getTransactionHistory(userId);
  }
}
