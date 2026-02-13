import {
  IsOptional,
  Matches,
  MinLength,
  MaxLength,
  IsString,
} from 'class-validator';
import {
  IsName,
  IsRequiredEmail,
  IsOptionalString,
} from '../../common/validators';
import { IsStrongPassword } from '../../common/validators/password.decorator';

export class RegisterDto {
  @IsName()
  name: string; // Full name of the user

  @IsOptionalString(3, 50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Username can only contain letters, numbers, underscores, and hyphens',
  })
  username?: string; // Optional username for login/display

  @IsRequiredEmail()
  email: string;

  @IsStrongPassword(12)
  password: string;

  @IsName()
  companyName: string; // Required for BOSS registration

  @IsOptionalString()
  @Matches(
    /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
    {
      message: 'Please enter a valid mobile number',
    },
  )
  mobile: string; // Mobile/phone number
}

export class LoginDto {
  @IsRequiredEmail()
  email: string;

  @IsOptionalString()
  password: string;
}

export class LoginWithTwoFADto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code: string; // TOTP code
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class ChangePasswordDto {
  @IsOptionalString(8)
  oldPassword: string;

  @IsStrongPassword(8)
  newPassword: string;
}

export class ForgotPasswordDto {
  @IsRequiredEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsStrongPassword(12)
  newPassword: string;
}
