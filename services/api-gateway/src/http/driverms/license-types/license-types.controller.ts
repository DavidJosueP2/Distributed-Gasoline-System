import { Controller, Post, Get, Param, Body, Req, Put, Delete, NotFoundException } from '@nestjs/common';
import { from, switchMap, map, catchError } from 'rxjs';
import { throwError } from 'rxjs';
import { GrpcClientFactory } from '../../../grpc/grpc-client.factory';
import { GrpcTimeout } from '../../../grpc/grpc-timeout.interceptor';
import { LicenseTypesServiceClient } from '../../../grpc/clients/driverms/license-types.client';
import { CreateLicenseTypeDto } from '../dto/create-license-type.dto';
import { UpdateLicenseTypeDto } from '../dto/update-license-type.dto';
import { LicenseTypeResponse } from '../dto/license-type-response.dto';

@Controller('license-types')
export class LicenseTypesController {
    constructor(private readonly factory: GrpcClientFactory) {}

    private async svc(req: any): Promise<LicenseTypesServiceClient> {
        const appName = process.env.DRIVER_APP_NAME || 'DRIVER-SERVICE';
        const client = await this.factory.forService(appName, 'driverms.v1', 'driver_ms.proto');
        return client.getService<LicenseTypesServiceClient>('LicenseTypesService');
    }

    @Post()
    create(@Body() dto: CreateLicenseTypeDto, @Req() req: any) {
        return from(this.svc(req)).pipe(
            switchMap(s => s.Create(dto, req._grpcMetadata))
        );
    }

    @Get()
    findAll(@Req() req: any) {
        return from(this.svc(req)).pipe(
            switchMap(s => s.FindAll({}, req._grpcMetadata)),
            map(r => {
                if (!r || !Array.isArray(r.items)) {
                    return [];
                }
                return r.items.map(mapProtoToHttp).filter(Boolean);
            })
        );
    }

    @Get('by-code')
    findByCode(@Param() params: any, @Req() req: any) {
        // expects ?code=XXX as query param - keep simple: read from req.query
        const code = (req.query?.code ?? '').toString();
        return from(this.svc(req)).pipe(
            switchMap(s => s.FindByCode({ code }, req._grpcMetadata))
        );
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Req() req: any) {
        return from(this.svc(req)).pipe(
            switchMap(s => s.FindOne({ id: Number(id) }, req._grpcMetadata)),
            map(result => {
                if (!result) {
                    throw new NotFoundException(`License type with ID ${id} not found`);
                }
                return mapProtoToHttp(result);
            }),
            catchError(err => {
                if (err instanceof NotFoundException) {
                    return throwError(() => err);
                }
                return throwError(() => new NotFoundException(`License type with ID ${id} not found`));
            })
        );
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: UpdateLicenseTypeDto, @Req() req: any) {
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

    @Post(':parentId/includes/:childId')
    addInclusion(@Param('parentId') parentId: string, @Param('childId') childId: string, @Req() req: any) {
        return from(this.svc(req)).pipe(
            switchMap(s => s.AddInclusion({ parent_id: Number(parentId), child_id: Number(childId) }, req._grpcMetadata))
        );
    }

    @Delete(':parentId/includes/:childId')
    removeInclusion(@Param('parentId') parentId: string, @Param('childId') childId: string, @Req() req: any) {
        return from(this.svc(req)).pipe(
            switchMap(s => s.RemoveInclusion({ parent_id: Number(parentId), child_id: Number(childId) }, req._grpcMetadata))
        );
    }

    @Get(':id/closure')
    getClosure(@Param('id') id: string, @Req() req: any) {
        return from(this.svc(req)).pipe(
            switchMap(s => s.GetClosure({ license_type_id: Number(id) }, req._grpcMetadata))
        );
    }
}

function mapProtoToHttp(p: any): LicenseTypeResponse | null {
    if (!p) return null;

    const read = (obj: any, snake: string, camel: string) => {
        if (!obj) return undefined;
        if (snake in obj) return obj[snake];
        if (camel in obj) return obj[camel];
        return undefined;
    };

    const safeNumber = (v: any) => {
        if (typeof v === 'number') return v;
        if (typeof v === 'string' && v !== '') {
            const n = Number(v);
            return Number.isNaN(n) ? 0 : n;
        }
        return 0;
    };

    const safeBool = (v: any) => {
        if (typeof v === 'boolean') return v;
        if (typeof v === 'number') return v === 1;
        if (typeof v === 'string') return v === 'true' || v === '1';
        return false;
    };

    const safeDate = (d: any): string => {
        if (!d) return '';
        if (typeof d === 'string') return d;
        try {
            const dt = d instanceof Date ? d : new Date(d);
            if (Number.isNaN(dt.getTime())) return '';
            return dt.toISOString();
        } catch {
            return '';
        }
    };

    const mapInclude = (inc: any) => ({
        parent_license_type_id: safeNumber(read(inc, 'parent_license_type_id', 'parentLicenseTypeId')),
        child_license_type_id: safeNumber(read(inc, 'child_license_type_id', 'childLicenseTypeId')),
    });

    const mapDriverLicense = (l: any) => {
        const rawStatus = read(l, 'status', 'status');
        let statusStr = 'VALID';
        if (typeof rawStatus === 'number') statusStr = rawStatus === 1 ? 'VALID' : rawStatus === 2 ? 'EXPIRED' : 'SUSPENDED';
        else if (typeof rawStatus === 'string') {
            const s = rawStatus.toUpperCase();
            if (['VALID', 'EXPIRED', 'SUSPENDED'].includes(s)) statusStr = s;
            else if (['1', '2', '3'].includes(s)) statusStr = s === '1' ? 'VALID' : s === '2' ? 'EXPIRED' : 'SUSPENDED';
        }

        return {
            driver_license_id: safeNumber(read(l, 'driver_license_id', 'driverLicenseId')),
            driver_id: safeNumber(read(l, 'driver_id', 'driverId')),
            license_type_id: safeNumber(read(l, 'license_type_id', 'licenseTypeId')),
            number: String(read(l, 'number', 'number') ?? ''),
            issued_at: String(read(l, 'issued_at', 'issuedAt') ?? ''),
            expires_at: String(read(l, 'expires_at', 'expiresAt') ?? ''),
            status: statusStr,
            version: safeNumber(read(l, 'version', 'version')),
        };
    };

    // Support both flat LicenseType and nested LicenseTypeWithIncludes
    const core = read(p, 'license_type', 'licenseType') ?? p;
    const parentArr =
        read(p, 'parent_includes', 'parentIncludes') ??
        read(core, 'parent_includes', 'parentIncludes') ?? [];
    const childArr =
        read(p, 'child_includes', 'childIncludes') ??
        read(core, 'child_includes', 'childIncludes') ?? [];
    const driversArr = read(p, 'driver_licenses', 'driverLicenses') ?? read(core, 'driver_licenses', 'driverLicenses') ?? [];

    return {
        license_type_id: safeNumber(read(core, 'license_type_id', 'licenseTypeId')),
        code: String(read(core, 'code', 'code') ?? ''),
        description: String(read(core, 'description', 'description') ?? ''),
        is_professional: safeBool(read(core, 'is_professional', 'isProfessional')),
        created_at: String(read(core, 'created_at', 'createdAt') ?? ''),
        parentIncludes: Array.isArray(parentArr) ? parentArr.map(mapInclude) : [],
        childIncludes: Array.isArray(childArr) ? childArr.map(mapInclude) : [],
        driverLicenses: Array.isArray(driversArr) ? driversArr.map(mapDriverLicense) : [],
    };
}
