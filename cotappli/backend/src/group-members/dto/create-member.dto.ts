import { IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateMemberDto {
  @IsString()
  @MinLength(2)
  displayName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // Mode "cotisation fixe" : somme exacte que ce membre doit verser.
  // Laisser vide pour rester en mode "libre" (statut basé sur l'existence d'un versement).
  @IsOptional()
  @IsNumber()
  @IsPositive()
  expectedAmount?: number;
}
