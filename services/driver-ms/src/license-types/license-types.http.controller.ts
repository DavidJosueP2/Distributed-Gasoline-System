import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { LicenseTypesService } from './license-types.service';
import { CreateLicenseTypeDto } from './dto/create-license-type.dto';
import { UpdateLicenseTypeDto } from './dto/update-license-type.dto';

@Controller('license-types')
export class LicenseTypesHttpController {
  constructor(private readonly service: LicenseTypesService) {}

  @Post()
  create(@Body() body: CreateLicenseTypeDto) {
    return this.service.create(body);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('by-code')
  findByCode(@Query('code') code: string) {
    return this.service.findByCode(code);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateLicenseTypeDto,
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post(':parentId/includes')
  addInclusion(
    @Param('parentId', ParseIntPipe) parentId: number,
    @Body('childId', ParseIntPipe) childId: number,
  ) {
    return this.service.addLicenseInclusion(parentId, childId);
  }

  @Delete(':parentId/includes/:childId')
  removeInclusion(
    @Param('parentId', ParseIntPipe) parentId: number,
    @Param('childId', ParseIntPipe) childId: number,
  ) {
    return this.service.removeLicenseInclusion(parentId, childId);
  }

  @Get(':id/closure')
  getClosure(@Param('id', ParseIntPipe) id: number) {
    return this.service.getLicenseClosure(id);
  }
}
