import { IsEmail, Matches } from 'class-validator';
import { englishEmailMessage, englishEmailPattern } from '../email-policy';

export class RequestPasswordResetDto {
  @IsEmail({ allow_utf8_local_part: false }, { message: englishEmailMessage })
  @Matches(englishEmailPattern, { message: englishEmailMessage })
  email!: string;
}
