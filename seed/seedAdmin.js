const bcrypt = require('bcrypt');

async function seedAdminUser(db) {
  const existingAdmin = await db.User.findOne({ where: { referralCode: 'ADMIN01' } });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10); // hash the password

    await db.User.create({
      phone: '1234567890',
      password: hashedPassword,
      referralCode: 'ADMIN01',
      referredBy: null,
      isAdmin: true
    });

    console.log('✅ Admin user seeded with referral code ADMIN01');
  } else {
    console.log('ℹ️ Admin user already exists');
  }
}

module.exports = seedAdminUser;
