import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('fuel_records')
export class FuelRecord {

  @PrimaryGeneratedColumn('identity', { generatedIdentity: 'ALWAYS' })
  id: number;

  @Column({ type: 'bigint', name: 'trip_id', unique: true })
  @Index('idx_fuel_records_trip_id')
  tripId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'fuel_real' })
  fuelReal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'difference' })
  difference: number;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'NOW()',
    name: 'registration_date'
  })
  registrationDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'observation' })
  observation: string;
}
