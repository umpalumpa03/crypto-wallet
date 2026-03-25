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
  public userId: string;

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
