// src/infra/persistence/typeorm/entities/route.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TripEntity } from './trip.entity';

@Entity('routes')
export class RouteEntity {
  @PrimaryGeneratedColumn('increment')
  id: string;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name: string;

  @Column({ type: 'varchar', length: 255, name: 'origin_name' })
  originName: string;

  @Column({ type: 'decimal', precision: 9, scale: 6, name: 'origin_lat' })
  originLat: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, name: 'origin_lng' })
  originLng: number;

  @Column({ type: 'varchar', length: 255, name: 'destination_name' })
  destinationName: string;

  @Column({ type: 'decimal', precision: 9, scale: 6, name: 'destination_lat' })
  destinationLat: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, name: 'destination_lng' })
  destinationLng: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'distance_km' })
  distanceKm: number;

  @Column({ type: 'varchar', length: 20, name: 'vehicle_type' })
  vehicleType: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => TripEntity, trip => trip.route)
  trips: TripEntity[];
}
