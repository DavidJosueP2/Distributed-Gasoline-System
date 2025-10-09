import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class LoggerService {
  private readonly logger = new Logger(LoggerService.name);

  constructor(private readonly elasticsearch: ElasticsearchService) {}

  /**
   * Mapea los niveles numéricos a sus equivalentes textuales.
   */
  
  private mapLogLevel(level: number | string): string {
    const levels: Record<number, string> = {
      0: 'INFO',
      1: 'WARN',
      2: 'ERROR',
      3: 'DEBUG',
    };

    // Si ya es string (por ejemplo "INFO"), se normaliza y devuelve igual
    if (typeof level === 'string') {
      const upper = level.toUpperCase();
      return Object.values(levels).includes(upper) ? upper : 'INFO';
    }

    // Si es número, se convierte según el mapa
    return levels[level] ?? 'INFO';
  }

  /**
   * Guarda un log en Elasticsearch, normalizando el nivel.
   */
  async logToElastic(index: string, message: any) {
    try {
      const normalizedLevel = this.mapLogLevel(message.level);

      await this.elasticsearch.index({
        index,
        document: {
          ...message,
          level: normalizedLevel,
          timestamp: new Date().toISOString(),
        },
      });

      this.logger.log(
        `Log almacenado en índice [${index}] con nivel ${normalizedLevel}`
      );
    } catch (error) {
      this.logger.error('Error guardando log en Elasticsearch', error);
    }
  }
}
