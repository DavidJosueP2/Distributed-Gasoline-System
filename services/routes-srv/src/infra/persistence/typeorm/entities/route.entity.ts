// src/infra/persistence/typeorm/entities/route.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TripEntity } from './trip.entity';

@Entity('routes')
export class RouteEntity {
  @PrimaryGeneratedColumn('increment')
  id: bigint;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'decimal', precision: 9, scale: 6 })
  originLat: number;

  @Column({ type: 'decimal', precision: 9, scale: 6 })
  originLng: number;

  @Column({ type: 'decimal', precision: 9, scale: 6 })
  destinationLat: number;

  @Column({ type: 'decimal', precision: 9, scale: 6 })
  destinationLng: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  distanceKm: number;

  @Column({ type: 'varchar', length: 20 })
  vehicleType: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => TripEntity, trip => trip.route)
  trips: TripEntity[];
}
