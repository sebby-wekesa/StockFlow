'use server'

// Public organization signup.
//
// Individual users must be invited by an organization admin. This action
// creates a new pending organization and its owner account only.

import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { checkRateLimitAsync, getClientIp } from '@/lib/rate-limit'
import { validatePassword } from '@/lib/security'

const signUpSchema = z.object({
  organizationName: z.string().trim().min(2).max(160),
  branchName: z.string().trim().min(2).max(160),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(2).max(120),
})

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function signUpOrganization(formData: FormData) {
  // Rate-limit: 3 signups per hour per IP.
  const ip = await getClientIp()
  const rl = await checkRateLimitAsync(`signup:${ip}`, {
    windowMs: 60 * 60_000,
    maxRequests: 3,
  })
  if (!rl.success) {
    return { error: rl.error }
  }

  // Honeypot — claim success without doing anything so bots think they won
  if (formData.get('website')) {
    return { success: true }
  }

  // Parse + validate input
  let data: z.infer<typeof signUpSchema>
  try {
    data = signUpSchema.parse({
      organizationName: formData.get('organizationName'),
      branchName: formData.get('branchName'),
      email: formData.get('email'),
      password: formData.get('password'),
      fullName: formData.get('fullName'),
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message ?? 'Invalid input' }
    }
    return { error: 'Invalid input' }
  }

  // Enforce password complexity
  const pw = validatePassword(data.password)
  if (!pw.isValid) {
    return { error: pw.errors[0] }
  }

  const existingUser = await prisma.user.findFirst({
    where: { email: data.email },
    select: { id: true },
  })
  if (existingUser) {
    return {
      error: 'An account with this email already exists. Try signing in instead.',
    }
  }

  // Create the Supabase auth user
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: false,
    user_metadata: {
      full_name: data.fullName,
      organization_name: data.organizationName,
      role: 'ADMIN',
    },
  })

  if (authError || !authData.user) {
    // Supabase rejects duplicate emails with status 422
    const msg = authError?.message ?? 'Failed to create user'
    if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists')) {
      return { error: 'An account with this email already exists. Try signing in instead.' }
    }
    console.error('Supabase signup failed:', authError)
    return { error: 'Could not create your account. Please try again or contact support.' }
  }

  const authUserId = authData.user.id

  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
  const slugBase = slugify(data.organizationName) || 'organization'
  const organizationSlug = `${slugBase}-${suffix}`
  const organizationCode = `${slugBase.replace(/-/g, '').slice(0, 12).toUpperCase() || 'ORG'}-${suffix.toUpperCase()}`

  try {
    await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: data.organizationName,
          slug: organizationSlug,
          code: organizationCode,
          email: data.email,
          status: 'PENDING_APPROVAL',
        },
      })
      const branch = await tx.branch.create({
        data: {
          organizationId: organization.id,
          name: data.branchName,
          code: 'MAIN',
        },
      })
      await tx.user.create({
        data: {
          id: authUserId,
          email: data.email,
          name: data.fullName,
          role: 'ADMIN',
          organizationId: organization.id,
          branchId: branch.id,
        },
      })
      await tx.organization.update({
        where: { id: organization.id },
        data: { ownerUserId: authUserId },
      })
    })
  } catch (err) {
    try {
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
    } catch (cleanupErr) {
      console.error(
        '[signup] Failed to clean up orphan auth user',
        authUserId,
        cleanupErr
      )
    }

    const msg = (err as Error).message
    if (msg.includes('Unique') || msg.toLowerCase().includes('unique')) {
      return {
        error: 'An account or organization with these details already exists.',
      }
    }
    console.error('[signup] User creation failed:', err)
    return {
      error: 'Could not create your account. Please try again or contact support.',
    }
  }

  return { success: true }
}
