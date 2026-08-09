import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateMemberDto {
  @IsString()
  @MinLength(2)
  displayName: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
