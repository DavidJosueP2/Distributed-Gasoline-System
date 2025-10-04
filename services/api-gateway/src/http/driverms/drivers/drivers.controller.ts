import { Controller, Post, Get, Param, Body, Req, Put, Delete } from '@nestjs/common';
import { from, switchMap, map } from 'rxjs';
import { GrpcClientFactory } from '../../../grpc/grpc-client.factory';
import { GrpcTimeout } from '../../../grpc/grpc-timeout.interceptor';
import { DriversServiceClient } from '../../../grpc/clients/driverms/drivers.client';

@Controller('drivers')
export class DriversController {
    constructor(private readonly factory: GrpcClientFactory) {}

    private async svc(req: any): Promise<DriversServiceClient> {
        const appName = process.env.DRIVER_APP_NAME || 'DRIVER-SERVICE';
        const client = await this.factory.forService(appName, 'driverms.v1', 'driver_ms.proto');
        return client.getService<DriversServiceClient>('DriversService');
    }

    @Post()
    create(@Body() dto: any, @Req() req: any) {
        return from(this.svc(req)).pipe(
            switchMap(s => s.Create(dto, req._grpcMetadata))
        );
    }

    @Get()
    findAll(@Req() req: any) {
        return from(this.svc(req)).pipe(
            switchMap(s => s.FindAll({}, req._grpcMetadata)),
            map(r => r.items)
        );
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Req() req: any) {
        return from(this.svc(req)).pipe(
            switchMap(s => s.FindOne({ id: Number(id) }, req._grpcMetadata)),
            map((driver: any) => {
                const rawLicenses = Array.isArray(driver?.licenses) ? driver.licenses : [];
                const license_ids = rawLicenses.map((l: any) => Number(l.driver_license_id));
                const today = new Date();
                const active_license_ids = rawLicenses
                    .filter((l: any) => (l.status === 1 || l.status === 'VALID') && new Date(l.expires_at) >= today)
                    .map((l: any) => Number(l.driver_license_id));
                return {
                    driver_id: Number(driver.driver_id),
                    user_id: Number(driver.user_id),
                    availability: driver.availability,
                    license_ids,
                    active_license_ids,
                };
            })
        );
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
        return from(this.svc(req)).pipe(
            switchMap(s => s.Update({ id: Number(id), ...dto }, req._grpcMetadata))
        );
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Req() req: any) {
        return from(this.svc(req)).pipe(
            switchMap(s => s.Remove({ id: Number(id) }, req._grpcMetadata))
        );
    }

    @Get(':id/can-drive/:licenseTypeId')
    canDrive(@Param('id') id: string, @Param('licenseTypeId') licenseTypeId: string, @Req() req: any) {
        return from(this.svc(req)).pipe(
            switchMap(s => s.CanDrive({ driver_id: Number(id), license_type_id: Number(licenseTypeId) }, req._grpcMetadata))
        );
    }
}
