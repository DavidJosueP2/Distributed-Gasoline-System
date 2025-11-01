import { PrismaClient } from 'prisma-client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding users database...');

  // 1. Crear Roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'System administrator',
    },
  });

  const supervisorRole = await prisma.role.upsert({
    where: { name: 'SUPERVISOR' },
    update: {},
    create: {
      name: 'SUPERVISOR',
      description: 'Operations supervisor',
    },
  });

  const driverRole = await prisma.role.upsert({
    where: { name: 'DRIVER' },
    update: {},
    create: {
      name: 'DRIVER',
      description: 'Vehicle driver',
    },
  });

  console.log('✅ Roles created');

  // 2. Crear Usuarios con contraseñas hasheadas
  const aliceAdmin = await prisma.user.upsert({
    where: { username: 'alice_admin' },
    update: {},
    create: {
      firstName: 'Alice',
      lastName: 'Admin',
      email: 'josuegarcab2@hotmail.com',
      phone: '+51 111 222 333',
      username: 'alice_admin',
      passwordHash: await bcrypt.hash('admin123', 10),
      status: 'ACTIVE',
    },
  });

  const samSupervisor = await prisma.user.upsert({
    where: { username: 'sam_supervisor' },
    update: {},
    create: {
      firstName: 'Sam',
      lastName: 'Supervisor',
      email: 'sam.supervisor@example.com',
      phone: '+51 444 555 666',
      username: 'sam_supervisor',
      passwordHash: await bcrypt.hash('supervisor123', 10),
      status: 'ACTIVE',
    },
  });

  const dylanDriver = await prisma.user.upsert({
    where: { username: 'dylan_driver' },
    update: {},
    create: {
      firstName: 'Dylan',
      lastName: 'Driver',
      email: 'dylan.driver@example.com',
      phone: '+51 777 888 999',
      username: 'dylan_driver',
      passwordHash: await bcrypt.hash('driver123', 10),
      status: 'ACTIVE',
    },
  });

  console.log('✅ Users created');

  // 3. Asignar roles a usuarios
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: aliceAdmin.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: aliceAdmin.id,
      roleId: adminRole.id,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: samSupervisor.id,
        roleId: supervisorRole.id,
      },
    },
    update: {},
    create: {
      userId: samSupervisor.id,
      roleId: supervisorRole.id,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: dylanDriver.id,
        roleId: driverRole.id,
      },
    },
    update: {},
    create: {
      userId: dylanDriver.id,
      roleId: driverRole.id,
    },
  });

  console.log('✅ User roles assigned');
  console.log('🎉 Seeding completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

