import { Controller } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { DriverLicensesService } from './driver-licenses.service';
import { DriverLicensesGrpcMapper } from './mappers/driver-licenses-grpc.mapper';

@Controller()
export class DriverLicensesGrpcController {
  constructor(private readonly service: DriverLicensesService) {}

  @GrpcMethod('DriverLicensesService', 'Create')
  async create(data: any) {
    try {
      console.log('📨 Create Driver License - Data:', JSON.stringify(data, null, 2));

      const createData = DriverLicensesGrpcMapper.mapCreateDataToDto(data);
      console.log('🔍 Create DTO:', createData);

      const license = await this.service.createFromGrpc(createData);
      return DriverLicensesGrpcMapper.mapDriverLicenseToProto(license);
    } catch (error) {
      console.error('❌ Create Driver License - Error:', error);
      throw new RpcException(error.message || 'Error creating driver license');
    }
  }

  @GrpcMethod('DriverLicensesService', 'FindByDriver')
  async findByDriver(data: any) {
    try {
      console.log('📨 FindByDriver - Data:', JSON.stringify(data, null, 2));

      const driverId = DriverLicensesGrpcMapper.mapFindByDriverData(data);
      const items = await this.service.findAllByDriver(driverId);

      return DriverLicensesGrpcMapper.mapDriverLicenseListToProto(items);
    } catch (error) {
      console.error('❌ FindByDriver - Error:', error);
      throw new RpcException(error.message || 'Error fetching driver licenses');
    }
  }

  @GrpcMethod('DriverLicensesService', 'Suspend')
  async suspend(data: any) {
    try {
      console.log('📨 Suspend License - Data:', JSON.stringify(data, null, 2));

      const { driverId, licenseId } = DriverLicensesGrpcMapper.mapSuspendData(data);
      const license = await this.service.suspendLicense(driverId, licenseId);
      
      return DriverLicensesGrpcMapper.mapDriverLicenseToProto(license);
    } catch (error) {
      console.error('❌ Suspend License - Error:', error);
      throw new RpcException(error.message || 'Error suspending license');
    }
  }

  @GrpcMethod('DriverLicensesService', 'Reactivate')
  async reactivate(data: any) {
    try {
      console.log('📨 Reactivate License - Data:', JSON.stringify(data, null, 2));

      const { driverId, licenseId } = DriverLicensesGrpcMapper.mapSuspendData(data);
      const license = await this.service.reactivateLicense(driverId, licenseId);
      
      return DriverLicensesGrpcMapper.mapDriverLicenseToProto(license);
    } catch (error) {
      console.error('❌ Reactivate License - Error:', error);
      throw new RpcException(error.message || 'Error reactivating license');
    }
  }

  @GrpcMethod('DriverLicensesService', 'FindActiveByDriver')
  async findActiveByDriver(data: any) {
    try {
      console.log('📨 FindActiveByDriver - Data:', JSON.stringify(data, null, 2));

      const driverId = DriverLicensesGrpcMapper.mapFindByDriverData(data);
      const items = await this.service.findActiveLicenses(driverId);

      return DriverLicensesGrpcMapper.mapDriverLicenseListToProto(items);
    } catch (error) {
      console.error('❌ FindActiveByDriver - Error:', error);
      throw new RpcException(error.message || 'Error fetching active licenses');
    }
  }
}