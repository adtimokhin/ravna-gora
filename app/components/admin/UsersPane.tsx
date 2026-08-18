import { UsersTable } from "./UsersTable";

export function UsersPane() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="type-h3 text-black">Users</h2>
      <p className="type-body text-gray-2">Manage member roles and account access.</p>
      <UsersTable />
    </div>
  );
}
