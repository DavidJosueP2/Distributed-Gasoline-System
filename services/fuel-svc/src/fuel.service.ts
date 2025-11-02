import { Injectable } from '@nestjs/common';
import type {
    GenerateGeneralReportRequest,
    GenerateGeneralReportResponse,
    GenerateVehicleDetailReportRequest,
    GenerateVehicleDetailReportResponse,
    VehicleDetailSummary,
} from './dto/fuel.dto';
import { GrpcClientFactory } from './grpc/grpc-client.factory';
import type { TripsServiceClient } from './grpc/clients/trips-client';
import type { DriversServiceClient } from './grpc/clients/driver-client';
import type { VehiclesServiceClient } from './grpc/clients/vehicle-client';
import { MachineType } from './grpc/clients/vehicle-client';
import { safeGrpcCall } from './common/auth/utils/grpc-call.util';
import { Metadata } from '@grpc/grpc-js';

@Injectable()
export class FuelService {
    private readonly TYPE_MACHINE_LIGHT = 'LIVIANA';
    private readonly TYPE_MACHINE_HEAVY = 'PESADA';

    constructor(private readonly grpcClientFactory: GrpcClientFactory) {}

    // gRPC client for trips service
    private async tripsClient(): Promise<TripsServiceClient> {
        const client = await this.grpcClientFactory.clientFor(
            'TRIPS-SERVICE',
            'trips',
            'trips.proto',
        );
        return client.getService<TripsServiceClient>('TripsService');
    }

    private async driverClient(): Promise<DriversServiceClient> {
        const client = await this.grpcClientFactory.clientFor(
            'DRIVER-SERVICE',
            'drivers',
            'drivers.proto',
        );
        return client.getService<DriversServiceClient>('DriversService');
    }

    private async vehiclesClient(): Promise<VehiclesServiceClient> {
        const client = await this.grpcClientFactory.clientFor(
            'VEHICLES-SERVICE',
            'vehicles',
            'vehicles.proto',
        );
        return client.getService<VehiclesServiceClient>('VehiclesService');
    }

    public async generateGeneralReport(
        data: GenerateGeneralReportRequest,
        metadata?: Metadata,
    ): Promise<GenerateGeneralReportResponse> {
        // Obtener viajes dentro del rango de fechas
        const tripsClient = await this.tripsClient();
        const tripsData = await safeGrpcCall(
            tripsClient.GetTripsByDateRange({
                startDate: data.startDate,
                endDate: data.endDate,
            }),
            'FuelService.GetTripsByDateRange',
        );

        // Inicializar acumuladores solo con los campos necesarios
        const summary = {
            [this.TYPE_MACHINE_LIGHT]: { estimated: 0, actual: 0 },
            [this.TYPE_MACHINE_HEAVY]: { estimated: 0, actual: 0 },
        };

        // Procesar cada viaje
        for (const trip of tripsData.trips) {
            const vehiclesClient = await this.vehiclesClient();
            const vehicleData = await safeGrpcCall(
                vehiclesClient.GetUnit({ vehicleId: trip.vehicleId }),
                'FuelService.GetUnit',
            );

            const vehicleModel = await safeGrpcCall(
                vehiclesClient.GetModel({ modelId: vehicleData.unit.modelId }),
                'FuelService.GetModel',
            );

            const type =
                vehicleModel.model.machineType === MachineType.LIGHT
                    ? this.TYPE_MACHINE_LIGHT
                    : this.TYPE_MACHINE_HEAVY;

            // Sumar litros estimados y reales
            summary[type].estimated += trip.fuelEstimated || 0;
            summary[type].actual += trip.fuelActual || 0;
        }

        // Retornar solo los datos que el frontend usa
        return {
            LIGHT: {
                estimated: summary[this.TYPE_MACHINE_LIGHT].estimated,
                actual: summary[this.TYPE_MACHINE_LIGHT].actual,
            },
            HEAVY: {
                estimated: summary[this.TYPE_MACHINE_HEAVY].estimated,
                actual: summary[this.TYPE_MACHINE_HEAVY].actual,
            },
        };
    }

    public async generateVehicleDetailReport(
        data: GenerateVehicleDetailReportRequest,
        metadata?: Metadata,
    ): Promise<GenerateVehicleDetailReportResponse> {
        // Obtener viajes dentro del rango de fechas
        const tripsClient = await this.tripsClient();
        const tripsData = await safeGrpcCall(
            tripsClient.GetTripsByDateRange({
                startDate: data.startDate,
                endDate: data.endDate,
            }),
            'FuelService.GetTripsByDateRange',
        );

        // Determinar el tipo de maquinaria interno
        const internalType =
            data.machineType === 'LIGHT'
                ? this.TYPE_MACHINE_LIGHT
                : this.TYPE_MACHINE_HEAVY;

        // Mapa para acumular datos por vehículo
        const vehicleMap = new Map<
            number,
            {
                trips: number;
                estimated: number;
                actual: number;
            }
        >();

        // Procesar cada viaje
        for (const trip of tripsData.trips) {
            const vehiclesClient = await this.vehiclesClient();
            const vehicleData = await safeGrpcCall(
                vehiclesClient.GetUnit({ vehicleId: trip.vehicleId }),
                'FuelService.GetUnit',
            );

            const vehicleModel = await safeGrpcCall(
                vehiclesClient.GetModel({ modelId: vehicleData.unit.modelId }),
                'FuelService.GetModel',
            );

            const type =
                vehicleModel.model.machineType === MachineType.LIGHT
                    ? this.TYPE_MACHINE_LIGHT
                    : this.TYPE_MACHINE_HEAVY;

            // Solo procesar si coincide con el tipo solicitado
            if (type === internalType) {
                if (!vehicleMap.has(trip.vehicleId)) {
                    vehicleMap.set(trip.vehicleId, {
                        trips: 0,
                        estimated: 0,
                        actual: 0,
                    });
                }

                const vehicleSummary = vehicleMap.get(trip.vehicleId)!;
                vehicleSummary.trips += 1;
                vehicleSummary.estimated += trip.fuelEstimated || 0;
                vehicleSummary.actual += trip.fuelActual || 0;
            }
        }

        // Convertir mapa a array y calcular diferencia y eficiencia
        const vehicles: VehicleDetailSummary[] = Array.from(
            vehicleMap.entries(),
        ).map(([vehicleId, summary]) => {
            const difference = summary.actual - summary.estimated;
            const efficiency =
                summary.actual > 0
                    ? (summary.estimated / summary.actual) * 100
                    : 0;

            return {
                vehicleId,
                trips: summary.trips,
                estimated: summary.estimated,
                actual: summary.actual,
                difference,
                efficiency,
            };
        });

        return { vehicles };
    }
}
