import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
import { englishEmailMessage, englishEmailPattern } from '../email-policy';

export class LoginDto {
  @IsEmail({ allow_utf8_local_part: false }, { message: englishEmailMessage })
  @Matches(englishEmailPattern, { message: englishEmailMessage })
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
