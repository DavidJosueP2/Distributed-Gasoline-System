/**
 * Domain service for calculating the calibration factor K for fuel consumption.
 *
 * The K factor represents the degradation of fuel efficiency due to:
 * 1. Engine aging (vehicle age)
 * 2. Wear from accumulated mileage (odometer)
 *
 * K = 1.0 → No degradation (nominal consumption)
 * K > 1.0 → Increased fuel consumption (degraded engine)
 *
 * Formula:
 *   K = 1 + (ageFactor * AGE_WEIGHT) + (odometerFactor * ODO_WEIGHT)
 *
 * Notes:
 *   • Age factor uses a LOGARITHMIC curve — fast early degradation that flattens over time.
 *   • Odometer factor uses a POWER curve (exponent 1.5) — slow at first, faster at high mileage.
 */
export class CalibrationKCalculator {
    // Weights for each factor
    private static readonly AGE_WEIGHT = 0.6; // 60% of total impact
    private static readonly ODO_WEIGHT = 0.4; // 40% of total impact

    // Maximum allowed degradation (30% increase in consumption)
    private static readonly K_MAX = 1.30;
    private static readonly K_MIN = 1.0;

    // Age parameters
    private static readonly AGE_NO_IMPACT_YEARS = 1;   // First year: no impact
    private static readonly AGE_MAX_IMPACT_YEARS = 20; // Max degradation after 20 years
    private static readonly AGE_MAX_DEGRADATION = 0.20; // Up to +20% due to age

    // Odometer parameters
    private static readonly ODO_NO_IMPACT_KM = 10_000;   // First 10k km: no impact
    private static readonly ODO_MAX_IMPACT_KM = 300_000; // Max degradation at 300k km
    private static readonly ODO_MAX_DEGRADATION = 0.15;  // Up to +15% due to mileage

    /**
     * Calculates the K factor based on model year and current odometer reading.
     * @param yearFrom - Model year or start of production
     * @param odometerKm - Current odometer reading (km)
     * @returns The calculated K factor (between K_MIN and K_MAX)
     */
    static calculate(yearFrom: number, odometerKm: number): number {
        const currentYear = new Date().getFullYear();
        const ageYears = Math.max(0, currentYear - yearFrom);
        const mileage = Math.max(0, odometerKm);

        const ageFactor = this.computeAgeFactor(ageYears);
        const odometerFactor = this.computeOdometerFactor(mileage);

        // Combine weighted impacts
        const totalIncrement =
            ageFactor * this.AGE_WEIGHT +
            odometerFactor * this.ODO_WEIGHT;

        const k = 1.0 + totalIncrement;

        // Clamp within limits
        return Math.min(Math.max(k, this.K_MIN), this.K_MAX);
    }

    /**
     * Computes degradation factor from vehicle age (logarithmic curve).
     * @param years - Vehicle age in years
     * @returns Factor between 0 and AGE_MAX_DEGRADATION
     */
    private static computeAgeFactor(years: number): number {
        if (years <= this.AGE_NO_IMPACT_YEARS) return 0;

        const effectiveYears = years - this.AGE_NO_IMPACT_YEARS;
        const range = this.AGE_MAX_IMPACT_YEARS - this.AGE_NO_IMPACT_YEARS;

        // Logarithmic curve: faster degradation early, slower later
        const ratio = Math.min(effectiveYears / range, 1.0);
        const logCurve = Math.log10(1 + 9 * ratio); // log10(1 + 9p)

        return logCurve * this.AGE_MAX_DEGRADATION;
    }

    /**
     * Computes degradation factor from odometer mileage (progressive power curve).
     * @param km - Odometer value (km)
     * @returns Factor between 0 and ODO_MAX_DEGRADATION
     */
    private static computeOdometerFactor(km: number): number {
        if (km <= this.ODO_NO_IMPACT_KM) return 0;

        const effectiveKm = km - this.ODO_NO_IMPACT_KM;
        const range = this.ODO_MAX_IMPACT_KM - this.ODO_NO_IMPACT_KM;

        // Power curve (exponent 1.5): slow early, accelerated wear at high km
        const ratio = Math.min(effectiveKm / range, 1.0);
        const powerCurve = Math.pow(ratio, 1.5);

        return powerCurve * this.ODO_MAX_DEGRADATION;
    }

    /**
     * Provides detailed breakdown of the K calculation (useful for debugging/logging).
     */
    static calculateWithDetails(yearFrom: number, odometerKm: number): {
        calibrationK: number;
        ageYears: number;
        ageFactor: number;
        odometerFactor: number;
        details: string;
    } {
        const currentYear = new Date().getFullYear();
        const ageYears = Math.max(0, currentYear - yearFrom);
        const mileage = Math.max(0, odometerKm);

        const ageFactor = this.computeAgeFactor(ageYears);
        const odometerFactor = this.computeOdometerFactor(mileage);

        const totalIncrement =
            ageFactor * this.AGE_WEIGHT +
            odometerFactor * this.ODO_WEIGHT;

        const k = Math.min(Math.max(1.0 + totalIncrement, this.K_MIN), this.K_MAX);

        const details = [
            `Age: ${ageYears} years (factor: ${(ageFactor * 100).toFixed(2)}%)`,
            `Mileage: ${mileage.toLocaleString()} km (factor: ${(odometerFactor * 100).toFixed(2)}%)`,
            `Total increment: ${(totalIncrement * 100).toFixed(2)}%`,
            `Final K factor: ${k.toFixed(5)}`
        ].join(' | ');

        return {
            calibrationK: k,
            ageYears,
            ageFactor,
            odometerFactor,
            details,
        };
    }
}
