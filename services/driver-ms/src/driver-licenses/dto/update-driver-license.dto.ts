import { PartialType } from '@nestjs/mapped-types';
import { CreateDriverLicenseHttpDto } from './create-driver-license.dto';

export class UpdateDriverLicenseDto extends PartialType(
  CreateDriverLicenseHttpDto,
) {}
