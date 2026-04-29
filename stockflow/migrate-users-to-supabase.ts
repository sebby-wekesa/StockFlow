// Migration script to move Prisma users to Supabase profiles
// Run this once to migrate existing user data

import { config } from 'dotenv';
config();

import { prisma } from './lib/prisma';
import { supabaseAdmin } from './lib/supabase-admin';

async function migrateUsersToSupabase() {
  try {
    console.log('Starting user migration to Supabase profiles...');

    // Get all users from Prisma
    const prismaUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        branchId: true,
      }
    });

    console.log(`Found ${prismaUsers.length} users to migrate`);

    for (const user of prismaUsers) {
      console.log(`Migrating user: ${user.email}`);

      try {
        // Check if profile already exists
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (existingProfile) {
          console.log(`Profile already exists for ${user.email}, updating...`);

          // Update existing profile
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({
              email: user.email,
              name: user.name,
              role: user.role,
              department: user.department,
              branch_id: user.branchId,
            })
            .eq('id', user.id);

          if (error) {
            console.error(`Error updating profile for ${user.email}:`, error);
          }
        } else {
          console.log(`Creating new profile for ${user.email}`);

          // Create new profile
          const { error } = await supabaseAdmin
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              department: user.department,
              branch_id: user.branchId,
            });

          if (error) {
            console.error(`Error creating profile for ${user.email}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error migrating user ${user.email}:`, error);
      }
    }

    console.log('Migration completed!');

    // Optional: You can now drop the Prisma User table if everything works
    // console.log('You can now safely drop the Prisma User table if desired.');

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
migrateUsersToSupabase()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });