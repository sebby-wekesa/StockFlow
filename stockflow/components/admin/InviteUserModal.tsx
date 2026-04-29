"use client";

import { useState } from "react";
import { inviteUser, getBranches } from "@/app/actions/users";
import { UserPlus, X, Loader2, MapPin } from "lucide-react";
import { useEffect } from "react";

export default function InviteUserModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      getBranches().then(setBranches);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      role: formData.get("role") as string,
      branchId: formData.get("branchId") as string,
    };

    try {
      const result = await inviteUser(data);
      if (result.success) {
        setIsOpen(false);
        alert("User invited successfully!");
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* The Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="btn btn-primary"
      >
        <UserPlus size={18} />
        Invite User
      </button>

      {/* The Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1e1e1e] border border-gray-800 w-full max-w-md p-6 rounded-xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Invite New User</h2>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-gray-400 hover:text-white transition-colors"
                disabled={loading}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                <input 
                  name="name" 
                  required 
                  placeholder="John Doe"
                  className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-blue-500 transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email Address</label>
                <input 
                  name="email" 
                  type="email" 
                  required 
                  placeholder="john@example.com"
                  className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-blue-500 transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Role</label>
                <select name="role" className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
                  <option value="OPERATOR">Operator</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                  <option value="WAREHOUSE">Warehouse</option>
                  <option value="SALES">Sales</option>
                  <option value="PACKAGING">Packaging</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Assigned Branch</label>
                <div className="relative">
                  <select 
                    name="branchId" 
                    required
                    className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg p-2 pl-9 text-white outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select a branch...</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#f0c040] hover:bg-[#f5d060] text-black font-medium py-2 rounded-lg mt-4 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-[#f0c040]/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending Invitation...
                  </>
                ) : (
                  "Send Invite"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
