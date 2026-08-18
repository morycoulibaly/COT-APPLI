import { IsIn, } from 'class-validator';

export type ReminderTone = 'amical' | 'nouchi' | 'formel';

export class GenerateReminderDto {
  @IsIn(['amical', 'nouchi', 'formel'])
  tone: ReminderTone;
}