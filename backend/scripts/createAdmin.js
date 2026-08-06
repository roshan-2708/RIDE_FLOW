const prisma = require('../src/config/db');

async function main() {
  const email = 'adminrideflow@gmail.com';
  const phone = '7205227353';

  // Check if user already exists by new email, old email, or phone
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'adminrideflow@gmail.com' },
        { email: 'admin@rideflow.com' },
        { phone }
      ]
    }
  });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: 'Admin',
        email,
        phone,
        role: 'ADMIN',
        isEmailVerified: true,
        isPhoneVerified: true,
        status: 'ACTIVE'
      }
    });
    console.log('✅ Admin user email updated:');
  } else {
    user = await prisma.user.create({
      data: {
        name: 'Admin',
        email,
        phone,
        role: 'ADMIN',
        isEmailVerified: true,
        isPhoneVerified: true,
        status: 'ACTIVE'
      }
    });
    console.log('✅ Admin user created:');
  }

  console.log({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified
  });
}

main()
  .catch((e) => {
    console.error('❌ Error updating admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
