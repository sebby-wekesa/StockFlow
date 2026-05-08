import { prisma } from '@/lib/prisma'
import { InviteButton } from './_components/InviteButton'
import { UserTable } from './_components/ClientComponents'

export default async function UsersPage() {
  const users = await prisma.User.findMany({
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-head text-2xl font-bold">User management</h1>
          <p className="text-muted text-sm mt-1">
            Invite new users and manage roles and access
          </p>
        </div>
        <InviteButton />
      </div>

      <UserTable users={users} />
    </div>
  )
}