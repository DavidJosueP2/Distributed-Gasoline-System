import {
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
} from 'class-validator';

// Definición de la restricción personalizada para validar que startDate sea anterior a endDate
@ValidatorConstraint({ name: 'isStartDateBeforeEndDate', async: false })
export class IsStartDateBeforeEndDateConstraint
    implements ValidatorConstraintInterface
{
    validate(value: any, args: ValidationArguments) {
        const obj = args.object as any;
        if (!obj.startDate || !obj.endDate) {
            return true; // Dejar que @IsNotEmpty maneje los campos vacíos
        }
        return new Date(obj.startDate) <= new Date(obj.endDate);
    }

    defaultMessage() {
        return 'La fecha de inicio debe ser anterior o igual a la fecha de fin';
    }
}
