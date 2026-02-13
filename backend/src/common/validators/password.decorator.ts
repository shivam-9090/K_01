import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string, args: ValidationArguments) {
    const minLength = args.constraints[0] || 8;

    if (!password || password.length < minLength) {
      return false;
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return false;
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return false;
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      return false;
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const minLength = args.constraints[0] || 8;
    return `Password must be at least ${minLength} characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character`;
  }
}

/**
 * Validates that a password is strong
 * @param minLength - Minimum password length (default: 8)
 * @param validationOptions - Additional validation options
 */
export function IsStrongPassword(
  minLength: number = 8,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [minLength],
      validator: IsStrongPasswordConstraint,
    });
  };
}

@ValidatorConstraint({ async: false })
export class IsValidEmailConstraint implements ValidatorConstraintInterface {
  validate(email: string) {
    if (!email) {
      return false;
    }

    // RFC 5322 compliant email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  defaultMessage() {
    return 'Invalid email format';
  }
}

/**
 * Validates that an email address is valid
 * @param validationOptions - Additional validation options
 */
export function IsValidEmail(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsValidEmailConstraint,
    });
  };
}
