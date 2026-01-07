import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Creating admin user...");

  const email = process.env.ADMIN_EMAIL || "admin@nami-nail.com";
  const password = process.env.ADMIN_PASSWORD || "admin123456";
  const name = process.env.ADMIN_NAME || "Admin User";
  const phone = process.env.ADMIN_PHONE || "0900000000";

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      name,
      phone,
      role: Role.OWNER,
    },
    create: {
      name,
      email,
      password: hashedPassword,
      phone,
      role: Role.OWNER,
    },
  });

  console.log("✅ Admin user created/updated:");
  console.log("   Email:", user.email);
  console.log("   Password:", password);
  console.log("   Name:", user.name);
  console.log("   Phone:", user.phone);
  console.log("   Role:", user.role);
  console.log("\n📋 You can now login with:");
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
