import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { TradeService } from './trade.service';
import { ExecuteTradeDto } from './dto/execute-trade.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('api/trade')
export class TradeController {
  constructor(private readonly tradeService: TradeService) {}

  @Get('portfolio')
  public async getPortfolio(@Req() req: Request) {
    const user = req.user as any;
    return this.tradeService.getPortfolio(user.id);
  }

  @Post('execute')
  public async executeTrade(@Req() req: Request, @Body() dto: ExecuteTradeDto) {
    const user = req.user as any;
    return this.tradeService.executeTrade(
      user.id,
      dto.side,
      dto.asset,
      dto.amount,
      dto.executionPrice,
    );
  }

  @Get('history')
  public async getHistory(@Req() req: Request) {
    const user = req.user as any;
    return this.tradeService.getTransactionHistory(user.id);
  }

  @Get('deposit-info')
  public async getDepositConfigs() {
    return this.tradeService.getDepositConfigs();
  }
}
