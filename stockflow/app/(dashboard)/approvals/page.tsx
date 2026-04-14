import { Metadata } from 'next'
import { ManagerApprovalQueue } from '@/components/ManagerApprovalQueue'
import { requireRole } from '@/lib/auth'
import { Toast } from '@/components/Toast'

export const metadata: Metadata = {
  title: 'Manager Approval Queue | StockFlow',
  description: 'Review and approve pending production orders',
}

export default async function ApprovalsPage() {
  // Verify user is a manager or admin
  let userRole = null
  try {
    const user = await requireRole('MANAGER', 'ADMIN')
    userRole = user.role
  } catch (error) {
    // User is not authorized, but we'll let the component handle the UI feedback
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <ManagerApprovalQueue userRole={userRole} />
      </div>
      <Toast />
    </div>
  )
}