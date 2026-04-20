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
    <tr>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
        {user.name}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
        {user.email}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
        <select
          disabled={isPending}
          defaultValue={user.role}
          onChange={handleChange}
          className="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="PENDING">Pending</option>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Manager</option>
          <option value="OPERATOR">Operator</option>
          <option value="WAREHOUSE">Warehouse</option>
          <option value="SALES">Sales</option>
          <option value="PACKAGING">Packaging</option>
        </select>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button
          disabled={isPending}
          onClick={handleDelete}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
        >
          Delete
        </button>
        {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
      </td>
    </tr>
  );
}