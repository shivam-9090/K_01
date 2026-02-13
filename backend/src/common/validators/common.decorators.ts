import { applyDecorators } from '@nestjs/common';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEmail,
  IsUUID,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsDateString,
  ValidationOptions,
  ArrayMinSize,
  IsInt,
  Min,
  Max,
} from 'class-validator';

/**
 * Validates a name field (2-100 characters)
 */
export function IsName(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsString(validationOptions),
    IsNotEmpty(validationOptions),
    MinLength(2, validationOptions),
    MaxLength(100, validationOptions),
  );
}

/**
 * Validates an optional string field
 */
export function IsOptionalString(
  minLength?: number,
  maxLength?: number,
  validationOptions?: ValidationOptions,
) {
  const decorators = [
    IsOptional(validationOptions),
    IsString(validationOptions),
  ];

  if (minLength !== undefined) {
    decorators.push(MinLength(minLength, validationOptions));
  }

  if (maxLength !== undefined) {
    decorators.push(MaxLength(maxLength, validationOptions));
  }

  return applyDecorators(...decorators);
}

/**
 * Validates a description field (optional, max 500 characters)
 */
export function IsDescription(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsOptional(validationOptions),
    IsString(validationOptions),
    MaxLength(500, validationOptions),
  );
}

/**
 * Validates an array of strings
 */
export function IsStringArray(
  minSize?: number,
  validationOptions?: ValidationOptions,
) {
  const decorators = [
    IsArray(validationOptions),
    IsString({ each: true, ...validationOptions }),
  ];

  if (minSize !== undefined) {
    decorators.push(ArrayMinSize(minSize, validationOptions));
  }

  return applyDecorators(...decorators);
}

/**
 * Validates an optional array of strings
 */
export function IsOptionalStringArray(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsOptional(validationOptions),
    IsArray(validationOptions),
    IsString({ each: true, ...validationOptions }),
  );
}

/**
 * Validates a UUID field
 */
export function IsId(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsString(validationOptions),
    IsNotEmpty(validationOptions),
    IsUUID('4', validationOptions),
  );
}

/**
 * Validates an optional UUID field
 */
export function IsOptionalId(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsOptional(validationOptions),
    IsString(validationOptions),
    IsUUID('4', validationOptions),
  );
}

/**
 * Validates an array of UUIDs
 */
export function IsIdArray(
  minSize?: number,
  validationOptions?: ValidationOptions,
) {
  const decorators = [
    IsArray(validationOptions),
    IsUUID('4', { each: true, ...validationOptions }),
  ];

  if (minSize !== undefined) {
    decorators.push(ArrayMinSize(minSize, validationOptions));
  }

  return applyDecorators(...decorators);
}

/**
 * Validates an optional array of UUIDs
 */
export function IsOptionalIdArray(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsOptional(validationOptions),
    IsArray(validationOptions),
    IsUUID('4', { each: true, ...validationOptions }),
  );
}

/**
 * Validates a required email field
 */
export function IsRequiredEmail(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsString(validationOptions),
    IsNotEmpty(validationOptions),
    IsEmail({}, validationOptions),
  );
}

/**
 * Validates an optional email field
 */
export function IsOptionalEmail(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsOptional(validationOptions),
    IsString(validationOptions),
    IsEmail({}, validationOptions),
  );
}

/**
 * Validates a required boolean field
 */
export function IsRequiredBoolean(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsBoolean(validationOptions),
    IsNotEmpty(validationOptions),
  );
}

/**
 * Validates an optional boolean field
 */
export function IsOptionalBoolean(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsOptional(validationOptions),
    IsBoolean(validationOptions),
  );
}

/**
 * Validates a required date string
 */
export function IsRequiredDate(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsDateString({}, validationOptions),
    IsNotEmpty(validationOptions),
  );
}

/**
 * Validates an optional date string
 */
export function IsOptionalDate(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsOptional(validationOptions),
    IsDateString({}, validationOptions),
  );
}

/**
 * Validates a positive integer
 */
export function IsPositiveInt(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsNumber({}, validationOptions),
    IsInt(validationOptions),
    Min(1, validationOptions),
  );
}

/**
 * Validates an optional positive integer
 */
export function IsOptionalPositiveInt(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsOptional(validationOptions),
    IsNumber({}, validationOptions),
    IsInt(validationOptions),
    Min(1, validationOptions),
  );
}

/**
 * Validates a priority field (1-5)
 */
export function IsPriority(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsNumber({}, validationOptions),
    IsInt(validationOptions),
    Min(1, validationOptions),
    Max(5, validationOptions),
  );
}

/**
 * Validates an optional priority field (1-5)
 */
export function IsOptionalPriority(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsOptional(validationOptions),
    IsNumber({}, validationOptions),
    IsInt(validationOptions),
    Min(1, validationOptions),
    Max(5, validationOptions),
  );
}
