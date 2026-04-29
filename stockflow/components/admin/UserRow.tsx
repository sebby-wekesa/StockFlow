"use client";

import { updateUserRole, deleteUser } from "@/app/actions/users";
import { useTransition, useState } from "react";

// Define exactly what the component needs
interface UserRowProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: any; // Or your Role enum
    department?: string | null;
  }
}

export function UserRow({ user }: UserRowProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;

    setError(null);
    // Wrap the server action in startTransition to keep the UI responsive
    startTransition(async () => {
      try {
        await updateUserRole(user.id, newRole);
      } catch (err) {
        setError("Failed to update role. Please try again.");
      }
    });
  };

  const handleDelete = () => {
    if (confirm(`Delete user ${user.email}?`)) {
      setError(null);
      startTransition(async () => {
        try {
          await deleteUser(user.id);
        } catch (err) {
          setError("Failed to delete user. Please try again.");
        }
      });
    }
  };

  return (
    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
      <select
        disabled={isPending}
        defaultValue={user.role}
        onChange={handleChange}
        className="bg-surface border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-accent focus:border-accent"
      >
        <option value="PENDING">Pending</option>
        <option value="ADMIN">Admin</option>
        <option value="MANAGER">Manager</option>
        <option value="OPERATOR">Operator</option>
        <option value="WAREHOUSE">Warehouse</option>
        <option value="SALES">Sales</option>
        <option value="PACKAGING">Packaging</option>
      </select>
      <button
        disabled={isPending}
        onClick={handleDelete}
        className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
      >
        Delete
      </button>
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  );
}