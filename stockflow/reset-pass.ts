// reset-pass.ts
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

// Use the DIRECT_URL from environment variables
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DIRECT_URL
        },
    },
});

async function reset() {
    const email = "your-email@example.com";
    const newPassword = "YourNewPassword123!";

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });

        console.log("✅ Password updated and hashed successfully!");
    } catch (e) {
        console.error("❌ Error updating password:", e);
    } finally {
        await prisma.$disconnect();
    }
}

reset();