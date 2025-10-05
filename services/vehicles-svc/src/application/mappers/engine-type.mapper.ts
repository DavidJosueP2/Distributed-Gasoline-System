import { EngineType } from "../../domain";

// Este mapper ya no es necesario porque los DTOs ahora usan directamente el enum EngineType del dominio
export class EngineTypeMapper {
    static toDto(type: EngineType): EngineType {
        return type;
    }

    static fromDto(dto: EngineType): EngineType {
        return dto;
    }
}
