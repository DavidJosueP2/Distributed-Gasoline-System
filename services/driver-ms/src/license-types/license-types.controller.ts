import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LicenseTypesService } from './license-types.service';
import { CreateLicenseTypeDto } from './dto/create-license-type.dto';
import { UpdateLicenseTypeDto } from './dto/update-license-type.dto';
import { AddInclusionDto } from './dto/add-inclusion.dto';
import { RemoveInclusionDto } from './dto/remove-inclusion.dto';

@Controller()
export class LicenseTypesController {
  constructor(private readonly licenseTypesService: LicenseTypesService) {}

  @MessagePattern('licenseTypes.create')
  create(@Payload() createLicenseTypeDto: CreateLicenseTypeDto) {
    return this.licenseTypesService.create(createLicenseTypeDto);
  }

  @MessagePattern('licenseTypes.findAll')
  findAll() {
    return this.licenseTypesService.findAll();
  }

  @MessagePattern('licenseTypes.findOne')
  findOne(@Payload() id: number) {
    return this.licenseTypesService.findOne(id);
  }

  @MessagePattern('licenseTypes.findByCode')
  findByCode(@Payload() code: string) {
    return this.licenseTypesService.findByCode(code);
  }

  @MessagePattern('licenseTypes.update')
  update(@Payload() data: { id: number; updateDto: UpdateLicenseTypeDto }) {
    return this.licenseTypesService.update(data.id, data.updateDto);
  }

  @MessagePattern('licenseTypes.remove')
  remove(@Payload() id: number) {
    return this.licenseTypesService.remove(id);
  }

  @MessagePattern('licenseTypes.addInclusion')
  addInclusion(@Payload() addInclusionDto: AddInclusionDto) {
    return this.licenseTypesService.addLicenseInclusion(
      addInclusionDto.parentId,
      addInclusionDto.childId,
    );
  }

  @MessagePattern('licenseTypes.removeInclusion')
  removeInclusion(@Payload() removeInclusionDto: RemoveInclusionDto) {
    return this.licenseTypesService.removeLicenseInclusion(
      removeInclusionDto.parentId,
      removeInclusionDto.childId,
    );
  }

  @MessagePattern('licenseTypes.getClosure')
  getClosure(@Payload() licenseTypeId: number) {
    return this.licenseTypesService.getLicenseClosure(licenseTypeId);
  }
}
