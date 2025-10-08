// src/driver-licenses/driver-licenses.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { DriverLicensesService } from './driver-licenses.service';
import { CreateDriverLicenseHttpDto } from './dto/create-driver-license.dto';
import { SuspendLicenseDto } from './dto/suspend-license.dto';

@Controller('drivers/:driverId/licenses')
export class DriverLicensesController {
  constructor(private readonly driverLicensesService: DriverLicensesService) {}

  // 1. POST /drivers/:driverId/licenses
  @Post()
  async create(
    @Param('driverId', ParseIntPipe) driverId: number,
    @Body() createDto: CreateDriverLicenseHttpDto,
  ) {
    return await this.driverLicensesService.createFromHttp(driverId, createDto);
  }

  // 2. GET /drivers/:driverId/licenses
  @Get()
  async findAllByDriver(@Param('driverId', ParseIntPipe) driverId: number) {
    return await this.driverLicensesService.findAllByDriver(driverId);
  }

  // 3. POST /drivers/:driverId/licenses/:licenseId/suspend
  @Post(':licenseId/suspend')
  @HttpCode(HttpStatus.OK)
  async suspend(
    @Param('driverId', ParseIntPipe) driverId: number,
    @Param('licenseId', ParseIntPipe) licenseId: number,
    @Body() suspendDto: SuspendLicenseDto,
  ) {
    return await this.driverLicensesService.suspendLicense(driverId, licenseId);
  }

  // 4. GET /drivers/:driverId/active-licenses
  @Get('active-licenses')
  async findActiveLicenses(@Param('driverId', ParseIntPipe) driverId: number) {
    return await this.driverLicensesService.findActiveLicenses(driverId);
  }

  // Alias: GET /drivers/:driverId/licenses/active
  @Get('active')
  async findActiveLicensesAlias(
    @Param('driverId', ParseIntPipe) driverId: number,
  ) {
    return await this.driverLicensesService.findActiveLicenses(driverId);
  }

  // Extra: GET specific license
  @Get(':licenseId')
  async findOne(
    @Param('driverId', ParseIntPipe) driverId: number,
    @Param('licenseId', ParseIntPipe) licenseId: number,
  ) {
    return await this.driverLicensesService.findOne(licenseId);
  }
}
