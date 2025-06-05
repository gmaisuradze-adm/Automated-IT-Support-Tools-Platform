import { Metadata } from 'next'
import DashboardLayout from '@/components/layout/dashboard-layout'
import DashboardOverview from '@/components/dashboard/dashboard-overview'

export const metadata: Metadata = {
  title: 'Dashboard | IT Support Platform',
  description: 'IT Support Tools Platform Dashboard',
}

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Welcome to the IT Support Tools Platform
          </p>
        </div>
        <DashboardOverview />
      </div>
    </DashboardLayout>
  )
}
