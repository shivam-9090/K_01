import { IsString, MinLength, MaxLength } from 'class-validator';

export class Enable2FaDto {
  @IsString()
  password: string;

  @IsString()
  @MinLength(6)
  @MaxLength(64)
  secret: string;

  @IsString()
  @MinLength(6)
  @MaxLength(10)
  code: string;
}

export class Verify2FaDto {
  @IsString()
  @MinLength(6)
  @MaxLength(10)
  code: string;
}

export class Verify2FaLoginDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(6)
  @MaxLength(10)
  code: string;
}

export class Disable2FaDto {
  @IsString()
  password: string;

  @IsString()
  @MinLength(6)
  @MaxLength(10)
  code: string;
}
