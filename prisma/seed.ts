import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcrypt'

async function main() {
  const prisma = new PrismaClient()
  const email = process.env.ADMIN_EMAIL || 'admin@example.com'
  const plain = process.env.ADMIN_PASSWORD || 'admin123'
  const hashed = await bcrypt.hash(plain, 10)

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hashed,
      role: Role.ADMIN,
    },
  })

  console.log(`✅ Admin upserted: ${email}`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
