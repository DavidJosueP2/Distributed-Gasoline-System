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
  const [
    aliceAdmin,
    bruceAdmin,
    carolAdmin,
    samSupervisor,
    markSupervisor,
    lisaSupervisor,
    dylanDriver,
    johnDriver,
    maryDriver,
  ] = await Promise.all([
    prisma.user.upsert({
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
    }),
    prisma.user.upsert({
      where: { username: 'bruce_admin' },
      update: {},
      create: {
        firstName: 'Bruce',
        lastName: 'Admin',
        email: 'bruceadmin@gmail.com',
        phone: '+51 111 333 555',
        username: 'bruce_admin',
        passwordHash: await bcrypt.hash('admin123', 10),
        status: 'ACTIVE',
      },
    }),
    prisma.user.upsert({
      where: { username: 'carol_admin' },
      update: {},
      create: {
        firstName: 'Carol',
        lastName: 'Admin',
        email: 'caroladmin@gmail.com',
        phone: '+51 111 444 666',
        username: 'carol_admin',
        passwordHash: await bcrypt.hash('admin123', 10),
        status: 'ACTIVE',
      },
    }),
    prisma.user.upsert({
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
    }),
    prisma.user.upsert({
      where: { username: 'mark_supervisor' },
      update: {},
      create: {
        firstName: 'Mark',
        lastName: 'Supervisor',
        email: 'marksupervisor@gmail.com',
        phone: '+51 444 666 888',
        username: 'mark_supervisor',
        passwordHash: await bcrypt.hash('supervisor123', 10),
        status: 'ACTIVE',
      },
    }),
    prisma.user.upsert({
      where: { username: 'lisa_supervisor' },
      update: {},
      create: {
        firstName: 'Lisa',
        lastName: 'Supervisor',
        email: 'lisasupervisor@gmail.com',
        phone: '+51 444 777 999',
        username: 'lisa_supervisor',
        passwordHash: await bcrypt.hash('supervisor123', 10),
        status: 'ACTIVE',
      },
    }),
    prisma.user.upsert({
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
    }),
    prisma.user.upsert({
      where: { username: 'john_driver' },
      update: {},
      create: {
        firstName: 'John',
        lastName: 'Driver',
        email: 'johndriver@gmail.com',
        phone: '+51 777 111 222',
        username: 'john_driver',
        passwordHash: await bcrypt.hash('driver123', 10),
        status: 'ACTIVE',
      },
    }),
    prisma.user.upsert({
      where: { username: 'mary_driver' },
      update: {},
      create: {
        firstName: 'Mary',
        lastName: 'Driver',
        email: 'marydriver@gmail.com',
        phone: '+51 777 222 333',
        username: 'mary_driver',
        passwordHash: await bcrypt.hash('driver123', 10),
        status: 'ACTIVE',
      },
    }),
  ]);

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

  const roleAssignments = [
    [aliceAdmin.id, adminRole.id],
    [bruceAdmin.id, adminRole.id],
    [carolAdmin.id, adminRole.id],
    [samSupervisor.id, supervisorRole.id],
    [markSupervisor.id, supervisorRole.id],
    [lisaSupervisor.id, supervisorRole.id],
    [dylanDriver.id, driverRole.id],
    [johnDriver.id, driverRole.id],
    [maryDriver.id, driverRole.id],
  ];

  await Promise.all(
    roleAssignments.map(([userId, roleId]) =>
      prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId,
            roleId,
          },
        },
        update: {},
        create: {
          userId,
          roleId,
        },
      }),
    ),
  );

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

