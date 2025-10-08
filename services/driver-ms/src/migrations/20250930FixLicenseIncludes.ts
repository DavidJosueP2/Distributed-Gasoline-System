import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixLicenseIncludes1696070000000 implements MigrationInterface {
  name = 'FixLicenseIncludes1696070000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // If the table doesn't exist, nothing to do in this migration.
    const hasTable = await queryRunner.hasTable('license_includes');
    if (!hasTable) return;

    // Backup existing data
    await queryRunner.query(
      'CREATE TABLE IF NOT EXISTS license_includes_bkp AS TABLE license_includes WITH NO DATA;',
    );
    await queryRunner.query(
      'INSERT INTO license_includes_bkp SELECT * FROM license_includes;',
    );

    // Remove exact duplicate pairs (keep one)
    await queryRunner.query(
      'DELETE FROM license_includes a USING license_includes b WHERE a.ctid < b.ctid AND a.parent_license_type_id = b.parent_license_type_id AND a.child_license_type_id = b.child_license_type_id;',
    );

    // Drop any single-column indexes on child_license_type_id that would block creating composite PK
    await queryRunner.query(
      "DO $$ DECLARE r record; BEGIN FOR r IN SELECT indexname FROM pg_indexes WHERE tablename='license_includes' AND indexdef ~ '\\(child_license_type_id\\)' AND indexdef !~ '\\(parent_license_type_id, child_license_type_id\\)' LOOP EXECUTE format('DROP INDEX IF EXISTS %I', r.indexname); END LOOP; END; $$;",
    );

    // Ensure non-unique indexes exist as in original schema
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_license_includes_parent ON license_includes(parent_license_type_id);',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_license_includes_child ON license_includes(child_license_type_id);',
    );

    // Add composite primary key if missing
    await queryRunner.query(
      "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'license_includes' AND c.contype = 'p') THEN ALTER TABLE license_includes ADD CONSTRAINT license_includes_pkey PRIMARY KEY (parent_license_type_id, child_license_type_id); END IF; END; $$;",
    );
  }

  public async down(): Promise<void> {
    // No-op down migration. Reverting schema changes automatically is risky without context.
    return Promise.resolve();
  }
}
