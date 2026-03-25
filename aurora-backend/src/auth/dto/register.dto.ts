import { IsEmail, IsNotEmpty, MinLength, IsString } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  public email: string;

  @IsNotEmpty()
  @MinLength(6)
  public password: string;

  @IsString()
  @IsNotEmpty()
  public fullName: string;
}
