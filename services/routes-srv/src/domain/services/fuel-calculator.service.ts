// src/domain/services/fuel-calculator.service.ts
export class FuelCalculatorService {
  /**
   * Calcula el consumo estimado de combustible
   * @param effectiveLPer100km Consumo efectivo del vehículo (L/100km)
   * @param distanceKm Distancia planificada en kilómetros
   * @returns Consumo estimado en litros (con 5% de holgura)
   */
  static calculateEstimatedFuel(effectiveLPer100km: number, distanceKm: number): number {
    const baseConsumption = effectiveLPer100km * (distanceKm / 100);
    return baseConsumption * 1.05; // +5% holgura
  }

  /**
   * Calcula el consumo real de combustible
   * @param effectiveLPer100km Consumo efectivo del vehículo (L/100km)
   * @param distanceKmReal Distancia real recorrida en kilómetros
   * @returns Consumo real en litros
   */
  static calculateActualFuel(effectiveLPer100km: number, distanceKmReal: number): number {
    return effectiveLPer100km * (distanceKmReal / 100);
  }

  /**
   * Calcula la distancia real basada en odómetro
   * @param odometerStart Lectura inicial del odómetro
   * @param odometerEnd Lectura final del odómetro
   * @returns Distancia real en kilómetros
   */
  static calculateRealDistance(odometerStart: number, odometerEnd: number): number {
    return odometerEnd - odometerStart;
  }

  /**
   * Calcula el porcentaje de desviación entre distancia planificada y real
   * @param plannedDistance Distancia planificada
   * @param realDistance Distancia real
   * @returns Porcentaje de desviación (0-100)
   */
  static calculateDeviationPercentage(plannedDistance: number, realDistance: number): number {
    return Math.abs(realDistance - plannedDistance) / plannedDistance * 100;
  }

  /**
   * Verifica si la desviación requiere comentario de revisión
   * @param deviationPercentage Porcentaje de desviación
   * @param threshold Umbral máximo permitido (default: 3%)
   * @returns true si requiere comentario obligatorio
   */
  static requiresReviewComment(deviationPercentage: number, threshold: number = 3): boolean {
    return deviationPercentage > threshold;
  }
}
