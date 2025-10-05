import { MachineType } from "../../domain";

// Este mapper ya no es necesario porque los DTOs ahora usan directamente el enum MachineType del dominio
export class MachineTypeMapper {
    static toDto(type: MachineType): MachineType {
        return type;
    }

    static fromDto(dto: MachineType): MachineType {
        return dto;
    }
}
