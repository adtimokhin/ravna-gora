"use client";

import { useState } from "react";
import { AdminSidebar, type AdminSidebarItem } from "./AdminSidebar";
import { IssuesPane } from "./IssuesPane";
import { UsersPane } from "./UsersPane";

type Section = "issues" | "users";

const ITEMS: AdminSidebarItem[] = [
  { key: "issues", label: "Newspaper Issues" },
  { key: "users", label: "Users" },
];

export function AdminDashboard() {
  const [section, setSection] = useState<Section>("issues");

  return (
    <div className="flex flex-col xl:flex-row gap-8 xl:gap-16">
      <div className="xl:w-64 shrink-0">
        <AdminSidebar
          items={ITEMS}
          active={section}
          onSelect={(key) => setSection(key as Section)}
        />
      </div>

      <div className="flex-1 min-w-0">
        {section === "issues" && <IssuesPane />}
        {section === "users" && <UsersPane />}
      </div>
    </div>
  );
}
