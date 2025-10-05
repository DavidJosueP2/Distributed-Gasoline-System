import { ValidationError } from 'class-validator';

export function flattenValidationErrors(
  errors: ValidationError[],
): Record<string, string[]> {
  const map: Record<string, string[]> = {};

  const walk = (err: ValidationError, parent?: string) => {
    const path = parent ? `${parent}.${err.property}` : err.property;
    if (err.constraints) {
      map[path] = Object.values(err.constraints);
    }
    if (err.children && err.children.length) {
      err.children.forEach((child) => walk(child, path));
    }
  };

  errors.forEach((e) => walk(e));
  return map;
}
