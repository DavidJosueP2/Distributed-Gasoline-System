import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriverTransformService } from './driver-transform.service';
import { 
  DriverResponse, 
  DriverSummaryResponse, 
  DriversListResponse,
  CanDriveResponse 
} from './dto/driver-response.dto';

@Controller('drivers')
export class DriversHttpController {
  constructor(
    private readonly service: DriversService,
    private readonly transformService: DriverTransformService,
  ) {}

  @Post()
  async create(@Body() createDriverDto: CreateDriverDto): Promise<DriverResponse> {
    const driver = await this.service.create(createDriverDto);
    // Reload with relations for complete response
    const driverWithRelations = await this.service.findOne(driver.driver_id);
    return this.transformService.transformToFullResponse(driverWithRelations);
  }

  @Get()
  async findAll(): Promise<DriversListResponse> {
    const drivers = await this.service.findAll();
    return this.transformService.transformToListResponse(drivers);
  }

    @Get(':id')
  async findOne(@Param('id') id: number): Promise<DriverResponse> {
    const driver = await this.service.findOne(id);
    return this.transformService.transformToFullResponse(driver);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDriverDto: UpdateDriverDto,
  ): Promise<DriverResponse> {
    const driver = await this.service.update(id, updateDriverDto);
    return this.transformService.transformToFullResponse(driver);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{message: string}> {
    await this.service.remove(id);
    return { message: `Driver with ID ${id} deleted successfully` };
  }

  @Post(':id/undelete')
  async undelete(@Param('id', ParseIntPipe) id: number): Promise<DriverResponse> {
    const driver = await this.service.undelete(id);
    return this.transformService.transformToFullResponse(driver);
  }

  @Get(':id/can-drive')
  async canDrive(
    @Param('id', ParseIntPipe) id: number,
    @Query('licenseTypeId', ParseIntPipe) licenseTypeId: number,
  ): Promise<CanDriveResponse> {
    // El método del servicio ahora retorna un objeto completo con can_drive, reason y matching_licenses
    const result = await this.service.canDrive(id, licenseTypeId);
    
    // Transformamos la respuesta para el formato de la API HTTP
    return {
      can_drive: result.can_drive,
      reason: result.reason || '',
      matching_licenses: result.matching_licenses || []
    };
  }
}
