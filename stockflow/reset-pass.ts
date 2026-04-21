// reset-pass.ts
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

// Force the connection URL here so the script doesn't fail
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "YOUR_DIRECT_URL_FROM_SUPABASE"
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