import { IsIn, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

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
  @IsIn(['XOF', 'EUR', 'USD'])
  currency?: string;
}
