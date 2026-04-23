import InviteUserModal from "@/components/admin/InviteUserModal";

export default function SettingsPage() {
  return (
    <div className="p-8 bg-[#0f1113] min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        {/* Replace your old button with this */}
        <InviteUserModal /> 
      </div>
      
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Settings & Configuration</h2>
        <p className="text-gray-400">
          This page allows you to manage users and platform-wide settings.
        </p>
      </div>
    </div>
  );
}
