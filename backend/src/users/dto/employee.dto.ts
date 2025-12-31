import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  Matches,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]:;"'<>,.?/]).{8,}$/,
    { message: 'Password must include upper, lower, number, and symbol' },
  )
  password: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[]; // e.g., ["frontend", "backend", "ai/ml"]

  @IsOptional()
  @IsString()
  achievements?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  attendance?: number;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]:;"'<>,.?/]).{8,}$/,
    { message: 'Password must include upper, lower, number, and symbol' },
  )
  password?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  achievements?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  attendance?: number;
}
