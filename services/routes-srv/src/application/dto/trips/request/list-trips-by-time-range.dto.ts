import { Transform } from 'class-transformer';

export class ListTripsByTimeRangeDto {
  @Transform(({ value, obj }) => {
    // gRPC envía en snake_case, pero NestJS puede mapearlo a camelCase
    // Intentamos leer de ambos lugares
    const dateStr = value ?? obj?.start_time ?? obj?.startTime;
    
    if (!dateStr) {
      throw new Error('La fecha de inicio es obligatoria');
    }
    
    if (typeof dateStr !== 'string') {
      throw new Error(`La fecha de inicio debe ser un string en formato YYYY-MM-DD, recibido: ${typeof dateStr}`);
    }
    
    // Validar formato YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new Error(`La fecha debe estar en formato YYYY-MM-DD (ejemplo: 2024-01-16), recibido: ${dateStr}`);
    }
    
    // Crear fecha a inicio del día (00:00:00 UTC)
    const date = new Date(dateStr + 'T00:00:00.000Z');
    if (isNaN(date.getTime())) {
      throw new Error(`Fecha inválida: ${dateStr}`);
    }
    
    return date;
  })
  startTime: Date;

  @Transform(({ value, obj }) => {
    // gRPC envía en snake_case, pero NestJS puede mapearlo a camelCase
    // Intentamos leer de ambos lugares
    const dateStr = value ?? obj?.end_time ?? obj?.endTime;
    
    if (!dateStr) {
      throw new Error('La fecha de fin es obligatoria');
    }
    
    if (typeof dateStr !== 'string') {
      throw new Error(`La fecha de fin debe ser un string en formato YYYY-MM-DD, recibido: ${typeof dateStr}`);
    }
    
    // Validar formato YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new Error(`La fecha debe estar en formato YYYY-MM-DD (ejemplo: 2024-01-16), recibido: ${dateStr}`);
    }
    
    // Crear fecha a fin del día (23:59:59.999 UTC)
    const date = new Date(dateStr + 'T23:59:59.999Z');
    if (isNaN(date.getTime())) {
      throw new Error(`Fecha inválida: ${dateStr}`);
    }
    
    return date;
  })
  endTime: Date;
}

