import { LicenseRefDto } from '../dto/unit-vehicle/license-ref.dto';

/**
 * Mapper para convertir licencias entre diferentes capas:
 * - DTO ↔ Dominio
 * - Dominio ↔ gRPC/Protobuf
 */
export const LicenseDtoMapper = {
    /**
     * Convierte LicenseRefDto a formato del dominio
     */
    toDomain(dto: LicenseRefDto): { code?: string; id?: bigint } {
        return {
            code: dto.licenseTypeCode || undefined,
            id: dto.licenseTypeId ? BigInt(dto.licenseTypeId) : undefined,
        };
    },

    /**
     * Convierte array de DTOs a formato del dominio
     */
    toDomainArray(dtos: LicenseRefDto[]): { code?: string; id?: bigint }[] {
        return dtos.map(dto => this.toDomain(dto));
    },

    /**
     * Convierte desde el dominio a DTO
     */
    toDto(domainLicense: { code?: string; id?: bigint }): LicenseRefDto {
        const dto = new LicenseRefDto();
        dto.licenseTypeCode = domainLicense.code;
        dto.licenseTypeId = domainLicense.id ? String(domainLicense.id) : undefined;
        return dto;
    },

    /**
     * Convierte array del dominio a DTOs
     */
    toDtoArray(domainLicenses: { code?: string; id?: bigint }[]): LicenseRefDto[] {
        return domainLicenses.map(lic => this.toDto(lic));
    },

    /**
     * Convierte del dominio a formato gRPC/Protobuf
     * IMPORTANTE: Protobuf usa licenseTypeCode y licenseTypeId (camelCase)
     */
    toGrpc(domainLicense: { code?: string; id?: bigint }): { licenseTypeCode?: string; licenseTypeId?: string } {
        return {
            licenseTypeCode: domainLicense.code || undefined,
            licenseTypeId: domainLicense.id ? String(domainLicense.id) : undefined,
        };
    },

    /**
     * Convierte array del dominio a formato gRPC
     */
    toGrpcArray(domainLicenses: { code?: string; id?: bigint }[]): { licenseTypeCode?: string; licenseTypeId?: string }[] {
        return domainLicenses.map(lic => this.toGrpc(lic));
    },

    /**
     * Convierte desde gRPC/Protobuf al dominio
     */
    fromGrpc(grpcLicense: { licenseTypeCode?: string; licenseTypeId?: string | number }): { code?: string; id?: bigint } {
        return {
            code: grpcLicense.licenseTypeCode || undefined,
            id: grpcLicense.licenseTypeId ? BigInt(grpcLicense.licenseTypeId) : undefined,
        };
    },

    /**
     * Convierte array desde gRPC al dominio
     */
    fromGrpcArray(grpcLicenses: { licenseTypeCode?: string; licenseTypeId?: string | number }[]): { code?: string; id?: bigint }[] {
        return grpcLicenses.map(lic => this.fromGrpc(lic));
    },
};

