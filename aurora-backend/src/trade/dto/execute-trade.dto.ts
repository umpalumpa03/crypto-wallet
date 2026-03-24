import {
  IsString,
  IsNumber,
  IsPositive,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { TxType } from '@prisma/client';

export class ExecuteTradeDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(TxType)
  side: TxType;

  @IsString()
  @IsNotEmpty()
  asset: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsNumber()
  @IsPositive()
  executionPrice: number;
}
