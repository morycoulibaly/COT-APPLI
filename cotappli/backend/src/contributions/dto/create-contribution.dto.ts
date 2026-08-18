import { IsDateString, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateContributionDto {
  @IsString()
  memberId!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsDateString()
  paymentDate!: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // Renseignés uniquement lors d'un versement créé via le scan d'un reçu Mobile Money
  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  @IsString()
  transactionReference?: string;
}