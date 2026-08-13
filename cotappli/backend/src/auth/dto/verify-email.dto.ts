import { IsEmail, IsString, Length } from 'class-validator';
 
export class VerifyEmailDto {
  @IsEmail()
  email!: string;
 
  @IsString()
  @Length(6, 6, { message: 'Le code doit contenir exactement 6 chiffres' })
  code!: string;
}
 