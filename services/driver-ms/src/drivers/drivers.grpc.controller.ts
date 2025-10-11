import { Controller } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { DriversService } from './drivers.service';
import { DriversGrpcMapper } from './mappers/drivers-grpc.mapper';

@Controller()
export class DriversGrpcController {
  constructor(private readonly service: DriversService) {}

  @GrpcMethod('DriversService', 'Create')
  async create(data: any, metadata: any) {
    try {
      console.log('📨 Create Driver - Data:', JSON.stringify(data, null, 2));

      const { createDto } = DriversGrpcMapper.mapCreateDataToDto(data);
      const drv = await this.service.create(createDto, metadata);

      const response = DriversGrpcMapper.mapDriverToResponse(drv);

      console.log('✅ Driver Created - Response:', JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      console.error('❌ Create Driver - Error:', error);
      throw new RpcException(error.message || 'Error creating driver');
    }
  }

  @GrpcMethod('DriversService', 'FindAll')
  async findAll() {
    try {
      const items = await this.service.findAll();
      console.log('✅ FindAll Drivers - Count:', items.length);

      const response = {
        drivers: items.map((item) => DriversGrpcMapper.mapDriverToProto(item)),
        total: DriversGrpcMapper.createLongObject(items.length),
      };

      console.log('🔍 Drivers Response:', JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      console.error('❌ FindAll Drivers - Error:', error);
      throw new RpcException(error.message || 'Error fetching drivers');
    }
  }

  @GrpcMethod('DriversService', 'FindOne')
  async findOne(data: any) {
    try {
      console.log('📨 FindOne Driver - Data:', JSON.stringify(data, null, 2));

      const driverId = DriversGrpcMapper.extractDriverId(data);
      const driver = await this.service.findOne(driverId);

      if (!driver) {
        throw new RpcException('Driver not found');
      }

      return DriversGrpcMapper.mapDriverToProto(driver);
    } catch (error) {
      console.error('❌ FindOne Driver - Error:', error);
      throw new RpcException(error.message || 'Error fetching driver');
    }
  }

  @GrpcMethod('DriversService', 'Update')
  async update(data: any, metadata: any) {
    try {
      console.log('📨 Update Driver - Data:', JSON.stringify(data, null, 2));

      const { updateDto, driverId } = DriversGrpcMapper.mapUpdateDataToDto(data);
      console.log('🔍 Update Data:', updateDto);

      const updatedDriver = await this.service.update(driverId, updateDto, metadata);
      const response = DriversGrpcMapper.mapDriverToResponse(updatedDriver);

      console.log('✅ Driver Updated - Response:', JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      console.error('❌ Update Driver - Error:', error);
      throw new RpcException(error.message || 'Error updating driver');
    }
  }

  @GrpcMethod('DriversService', 'Remove')
  async remove(data: any) {
    try {
      console.log('📨 Remove Driver - Data:', JSON.stringify(data, null, 2));

      const driverId = DriversGrpcMapper.extractDriverId(data);
      await this.service.remove(driverId);

      return { success: true };
    } catch (error) {
      console.error('❌ Remove Driver - Error:', error);
      throw new RpcException(error.message || 'Error removing driver');
    }
  }

  @GrpcMethod('DriversService', 'CanDrive')
  async canDrive(data: any) {
    try {
      console.log('📨 CanDrive - Data:', JSON.stringify(data, null, 2));

      const { driverId, licenseTypeId } = DriversGrpcMapper.mapCanDriveData(data);
      const result = await this.service.canDrive(driverId, licenseTypeId);

      return DriversGrpcMapper.mapCanDriveResponse(result);
    } catch (error) {
      console.error('❌ CanDrive - Error:', error);
      throw new RpcException(error.message || 'Error checking drive permission');
    }
  }
}