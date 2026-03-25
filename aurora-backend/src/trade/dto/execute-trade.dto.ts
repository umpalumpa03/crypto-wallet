import {
  IsNumber,
  IsPositive,
  IsEnum,
  IsNotEmpty,
  IsString,
} from 'class-validator';
import { TxType } from '@prisma/client';

export class ExecuteTradeDto {
  @IsEnum(TxType)
  public side: TxType;

  @IsString()
  @IsNotEmpty()
  public asset: string;

  @IsNumber()
  @IsPositive()
  public amount: number;

  @IsNumber()
  @IsPositive()
  public executionPrice: number;
}
