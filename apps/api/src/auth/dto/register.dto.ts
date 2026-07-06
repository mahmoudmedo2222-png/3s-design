import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { englishEmailMessage, englishEmailPattern } from '../email-policy';

export class RegisterDto {
  @IsEmail({ allow_utf8_local_part: false }, { message: englishEmailMessage })
  @Matches(englishEmailPattern, { message: englishEmailMessage })
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must include uppercase, lowercase, and number characters',
  })
  password!: string;
}
