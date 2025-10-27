// src/infra/persistence/typeorm/entities/trip.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { RouteEntity } from './route.entity';

@Entity('trips')
export class TripEntity {
  @PrimaryGeneratedColumn('increment')
  id: string;

  @Column({ type: 'bigint' })
  routeId: string;

  @Column({ type: 'bigint' })
  supervisorId: string;

  @Column({ type: 'bigint' })
  driverId: string;

  @Column({ type: 'bigint' })
  vehicleId: string;

  @Column({ type: 'timestamptz', nullable: true })
  startTime: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endTime: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'CREADO' })
  status: string;

  @Column({ type: 'decimal', precision: 12, scale: 1 })
  odometerStart: number;

  @Column({ type: 'decimal', precision: 12, scale: 1, nullable: true })
  odometerEnd: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  distanceKmReal: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  distanceKmPlanned: number;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  fuelEstimated: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  fuelActual: number | null;

  @Column({ type: 'text', nullable: true })
  reviewComment: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => RouteEntity, route => route.trips)
  @JoinColumn({ name: 'routeId' })
  route: RouteEntity;
}
