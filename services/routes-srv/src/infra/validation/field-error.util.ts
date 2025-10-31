// src/infra/validation/field-error.util.ts
import { ValidationError } from 'class-validator';

export function flattenValidationErrors(errors: ValidationError[]): any {
  const result: any = {};
  
  for (const error of errors) {
    if (error.children && error.children.length > 0) {
      const nestedErrors = flattenValidationErrors(error.children);
      Object.assign(result, nestedErrors);
    } else {
      result[error.property] = Object.values(error.constraints || {});
    }
  }
  
  return result;
}
