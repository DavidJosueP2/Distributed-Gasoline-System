import { PartialType } from '@nestjs/mapped-types';
import { CreateLicenseTypeDto } from './create-license-type.dto';

export class UpdateLicenseTypeDto extends PartialType(CreateLicenseTypeDto) {}
