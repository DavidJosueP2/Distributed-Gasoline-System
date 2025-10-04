import { Controller, Post, Get, Param, Body, Req } from '@nestjs/common';
import { from, switchMap, map } from 'rxjs';
import { GrpcClientFactory } from '../../../grpc/grpc-client.factory';
import { GrpcTimeout } from '../../../grpc/grpc-timeout.interceptor';
import { DriverLicensesServiceClient } from '../../../grpc/clients/driverms/driver-licenses.client';
import { CreateDriverLicenseDto } from '../dto/create-driver-license.dto';

@Controller('drivers/:driverId/licenses')
export class DriverLicensesController {
    constructor(private readonly factory: GrpcClientFactory) {}

    private async svc(req: any): Promise<DriverLicensesServiceClient> {
        const appName = process.env.DRIVER_APP_NAME || 'DRIVER-SERVICE';
        const client = await this.factory.forService(appName, 'driverms.v1', 'driver_ms.proto');
        return client.getService<DriverLicensesServiceClient>('DriverLicensesService');
    }

    @Post()
    @GrpcTimeout(2000)
    create(@Param('driverId') driverId: string, @Body() dto: CreateDriverLicenseDto, @Req() req: any) {
        const d = dto as any;
        const payload = {
            driver_id: Number(driverId),
            license_type_id: Number(d.license_type_id ?? d.licenseTypeId ?? d.license_type ?? d.licenseType),
            number: d.number,
            issued_at: d.issued_at ?? d.issuedAt,
            expires_at: d.expires_at ?? d.expiresAt,
            status: d.status,
        };
        return from(this.svc(req)).pipe(
            switchMap(s => s.Create(payload as any, req._grpcMetadata))
        );
    }

    @Get()
    @GrpcTimeout(1500)
    findByDriver(@Param('driverId') driverId: string, @Req() req: any) {
        return from(this.svc(req)).pipe(
            switchMap(s => s.FindByDriver({ driver_id: Number(driverId) }, req._grpcMetadata)),
            map(r => r.items)
        );
    }

    @Post(':licenseId/suspend')
    @GrpcTimeout(1500)
    suspend(@Param('driverId') driverId: string, @Param('licenseId') licenseId: string, @Req() req: any) {
        return from(this.svc(req)).pipe(
            switchMap(s => s.Suspend({ driver_id: Number(driverId), license_id: Number(licenseId) }, req._grpcMetadata))
        );
    }

    @Get('active')
    @GrpcTimeout(1500)
    findActive(@Param('driverId') driverId: string, @Req() req: any) {
        return from(this.svc(req)).pipe(
            switchMap(s => s.FindActiveByDriver({ driver_id: Number(driverId) }, req._grpcMetadata)),
            map(r => r.items)
        );
    }
}
