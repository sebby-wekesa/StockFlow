// Migration script to move Prisma users to Supabase profiles
// Run this once to migrate existing user data

import { config } from 'dotenv';
import path from 'path';
import type { User } from '@supabase/supabase-js';
config({ path: path.join(process.cwd(), '.env') });

console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

import { prisma } from './lib/prisma';
import { supabaseAdmin } from './lib/supabase-admin';

async function migrateUsersToSupabase() {
  try {
    console.log('Starting user migration to Supabase profiles...');
    console.log('Env loaded:', !!process.env.DATABASE_URL, !!process.env.NEXT_PUBLIC_SUPABASE_URL);

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
          const updateData: any = {
            email: user.email,
            name: user.name,
            role: user.role,
            department: user.department,
          };
          if (user.branchId) {
            updateData.branch_id = user.branchId;
          }
          const { error } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('id', user.id);

          if (error) {
            console.error(`Error updating profile for ${user.email}:`, error);
          }
        } else {
          console.log(`Creating new auth user and profile for ${user.email}`);

          // Try to create auth user first
          let authUser;
          const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: user.email,
            password: 'TempPass123!', // Temporary password - users should change this
            email_confirm: true, // Auto-confirm email
            user_metadata: {
              name: user.name,
            }
          });

          if (createError && createError.message.includes('already been registered')) {
            // User exists, get the user
            const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
            if (listError) {
              console.error(`Error listing users:`, listError);
              continue;
            }
            authUser = existingUsers.users.find((u: User) => u.email === user.email);
            if (authUser) {
              // Update password
              const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
                password: 'TempPass123!',
              });
              if (updateError) {
                console.error(`Error updating password for ${user.email}:`, updateError);
              } else {
                console.log(`Updated password for existing user ${user.email}`);
              }
            }
          } else if (createError) {
            console.error(`Error creating auth user for ${user.email}:`, createError);
            continue;
          } else {
            authUser = newAuthUser;
          }

          if (!authUser) {
            console.error(`No auth user found for ${user.email}`);
            continue;
          }

          // Create or update profile
          const profileId = authUser.user?.id || authUser.id;
          const profileData: any = {
            id: profileId,
            email: user.email,
            name: user.name,
            role: user.role,
            department: user.department,
          };
          if (user.branchId) {
            profileData.branch_id = user.branchId;
          }

          // Check if profile exists
          const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', profileId)
            .single();

          if (existingProfile) {
            // Update profile
            const { error: updateError } = await supabaseAdmin
              .from('profiles')
              .update(profileData)
              .eq('id', profileId);
            if (updateError) {
              console.error(`Error updating profile for ${user.email}:`, updateError);
            }
          } else {
            // Insert profile
            const { error: insertError } = await supabaseAdmin
              .from('profiles')
              .insert(profileData);
            if (insertError) {
              console.error(`Error creating profile for ${user.email}:`, insertError);
            }
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
