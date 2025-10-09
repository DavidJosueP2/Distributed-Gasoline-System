import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Controller()
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @MessagePattern('createDriver')
  create(@Payload() createDriverDto: CreateDriverDto) {
    return this.driversService.create(createDriverDto);
  }

  @MessagePattern('findAllDrivers')
  findAll() {
    return this.driversService.findAll();
  }

  @MessagePattern('findOneDriver')
  findOne(@Payload() id: number) {
    return this.driversService.findOne(id);
  }

  /*
  @MessagePattern('updateDriver')
  update(@Payload() updateDriverDto: UpdateDriverDto) {
    return this.driversService.update(updateDriverDto.id, updateDriverDto);
  }
*/

  @MessagePattern('removeDriver')
  remove(@Payload() id: number) {
    return this.driversService.remove(id);
  }

  @MessagePattern('drivers.canDrive')
  canDrive(@Payload() data: { driverId: number; licenseTypeId: number }) {
    return this.driversService.canDrive(data.driverId, data.licenseTypeId);
  }
}
