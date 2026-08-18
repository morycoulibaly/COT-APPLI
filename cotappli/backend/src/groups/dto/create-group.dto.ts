import { IsIn, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../../common/constants/currencies';

export class CreateGroupDto {
  @IsString()
  @MinLength(2)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @IsPositive()
  targetAmount: number;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;

  // Affiché sur la page publique : comment verser sa part (ex: numéro Mobile Money)
  @IsOptional()
  @IsString()
  paymentInstructions?: string;
}