import { ValidationError } from 'class-validator';

export function flattenValidationErrors(errors: ValidationError[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};

  const walk = (error: ValidationError, parentPath?: string) => {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    if (error.constraints) {
      map[path] = Object.values(error.constraints);
    }
    if (error.children?.length) {
      error.children.forEach((child) => walk(child, path));
    }
  };

  errors.forEach((error) => walk(error));
  return map;
}
