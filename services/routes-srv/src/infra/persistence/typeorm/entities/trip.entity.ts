// src/infra/persistence/typeorm/entities/trip.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { RouteEntity } from './route.entity';

@Entity('trips')
export class TripEntity {
  @PrimaryGeneratedColumn('increment')
  id: string;

  @Column({ type: 'bigint', name: 'route_id' })
  routeId: string;

  @Column({ type: 'bigint', name: 'supervisor_id' })
  supervisorId: string;

  @Column({ type: 'bigint', name: 'driver_id' })
  driverId: string;

  @Column({ type: 'bigint', name: 'vehicle_id' })
  vehicleId: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'start_time' })
  startTime: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'end_time' })
  endTime: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'CREADO' })
  status: string;

  @Column({ type: 'decimal', precision: 12, scale: 1, name: 'odometer_start' })
  odometerStart: number;

  @Column({ type: 'decimal', precision: 12, scale: 1, nullable: true, name: 'odometer_end' })
  odometerEnd: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'distance_km_real' })
  distanceKmReal: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'distance_km_planned' })
  distanceKmPlanned: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, name: 'fuel_estimated' })
  fuelEstimated: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true, name: 'fuel_actual' })
  fuelActual: number | null;

  @Column({ type: 'text', nullable: true, name: 'review_comment' })
  reviewComment: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => RouteEntity, route => route.trips)
  @JoinColumn({ name: 'route_id' })
  route: RouteEntity;
}
