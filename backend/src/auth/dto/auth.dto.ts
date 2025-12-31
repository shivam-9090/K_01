import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string; // Full name of the user

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(12)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]:;"'<>,.?/]).{12,}$/,
    {
      message:
        'Password must be at least 12 characters and include upper, lower, number, and symbol',
    },
  )
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  companyName: string; // Required for BOSS registration

  @IsString()
  @Matches(
    /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
    {
      message: 'Please enter a valid mobile number',
    },
  )
  mobile: string; // Mobile/phone number
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
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
  @IsString()
  @MinLength(8)
  oldPassword: string;

  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]:;"'<>,.?/]).{8,}$/,
    { message: 'Password must include upper, lower, number, and symbol' },
  )
  newPassword: string;
}
