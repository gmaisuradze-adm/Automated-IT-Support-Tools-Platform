import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create default roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      description: 'System administrator with full access',
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {},
    create: {
      name: 'Manager',
      description: 'Department manager with elevated privileges',
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'User' },
    update: {},
    create: {
      name: 'User',
      description: 'Standard user with basic access',
    },
  });

  const technicianRole = await prisma.role.upsert({
    where: { name: 'Technician' },
    update: {},
    create: {
      name: 'Technician',
      description: 'IT technician with maintenance and support access',
    },
  });

  // Create default permissions
  const permissions = [
    // User management
    { resource: 'users', action: 'create', description: 'Create new users' },
    { resource: 'users', action: 'read', description: 'View user information' },
    { resource: 'users', action: 'update', description: 'Update user information' },
    { resource: 'users', action: 'delete', description: 'Delete users' },
    
    // Inventory management
    { resource: 'inventory', action: 'create', description: 'Add new inventory items' },
    { resource: 'inventory', action: 'read', description: 'View inventory' },
    { resource: 'inventory', action: 'update', description: 'Update inventory items' },
    { resource: 'inventory', action: 'delete', description: 'Remove inventory items' },
    
    // Request management
    { resource: 'requests', action: 'create', description: 'Create new requests' },
    { resource: 'requests', action: 'read', description: 'View requests' },
    { resource: 'requests', action: 'update', description: 'Update requests' },
    { resource: 'requests', action: 'approve', description: 'Approve requests' },
    { resource: 'requests', action: 'delete', description: 'Delete requests' },
    
    // Admin functions
    { resource: 'admin', action: 'manage', description: 'Full administrative access' },
    { resource: 'audit', action: 'read', description: 'View audit logs' },
    { resource: 'settings', action: 'manage', description: 'Manage system settings' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { 
        resource_action: { 
          resource: permission.resource, 
          action: permission.action 
        } 
      },
      update: {},
      create: permission,
    });
  }

  // Assign permissions to roles
  const allPermissions = await prisma.permission.findMany();
  
  // Admin gets all permissions
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  // Manager gets most permissions except user management
  const managerPermissions = allPermissions.filter(
    p => !['users:delete', 'admin:manage'].includes(`${p.resource}:${p.action}`)
  );
  
  for (const permission of managerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: managerRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: managerRole.id,
        permissionId: permission.id,
      },
    });
  }

  // User gets basic read permissions
  const userPermissions = allPermissions.filter(
    p => p.action === 'read' || (p.resource === 'requests' && p.action === 'create')
  );
  
  for (const permission of userPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: userRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: userRole.id,
        permissionId: permission.id,
      },
    });
  }

  // Create default categories
  const categories = [
    { name: 'Computers', description: 'Desktop and laptop computers' },
    { name: 'Monitors', description: 'Display monitors and screens' },
    { name: 'Printers', description: 'Printing devices' },
    { name: 'Network Equipment', description: 'Routers, switches, and network devices' },
    { name: 'Medical Equipment', description: 'Hospital-specific medical devices' },
    { name: 'Software', description: 'Software licenses and applications' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123!', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@hospital.com' },
    update: {},
    create: {
      email: 'admin@hospital.com',
      username: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
      password: hashedPassword,
      isActive: true,
      isVerified: true,
    },
  });

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  console.log('✅ Database seeding completed successfully!');
  console.log(`👤 Admin user created: admin@hospital.com / admin123!`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
