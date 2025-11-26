import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDeletedAtToDrivers1732550400000 implements MigrationInterface {
  name = 'AddDeletedAtToDrivers1732550400000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar si la columna ya existe
    const table = await queryRunner.getTable('drivers');
    const deletedAtColumn = table?.findColumnByName('deleted_at');

    if (!deletedAtColumn) {
      await queryRunner.addColumn(
        'drivers',
        new TableColumn({
          name: 'deleted_at',
          type: 'timestamptz',
          isNullable: true,
        }),
      );
      console.log('✅ Columna deleted_at agregada a la tabla drivers');
    } else {
      console.log('⚠️ La columna deleted_at ya existe en la tabla drivers');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Verificar si la columna existe antes de eliminarla
    const table = await queryRunner.getTable('drivers');
    const deletedAtColumn = table?.findColumnByName('deleted_at');

    if (deletedAtColumn) {
      await queryRunner.dropColumn('drivers', 'deleted_at');
      console.log('✅ Columna deleted_at eliminada de la tabla drivers');
    } else {
      console.log('⚠️ La columna deleted_at no existe en la tabla drivers');
    }
  }
}

