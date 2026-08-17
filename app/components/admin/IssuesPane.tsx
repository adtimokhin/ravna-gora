import { Link } from "../../../i18n/navigation";
import { DevTokenPanel } from "./DevTokenPanel";
import { IssuesList } from "./IssuesList";

export function IssuesPane() {
  return (
    <div className="flex flex-col gap-6">
      <DevTokenPanel />
      <div className="flex items-center justify-between gap-4">
        <h2 className="type-h3 text-black">Newspaper Issues</h2>
        <Link
          href="/admin/issues/new"
          className="inline-block bg-blue-2 text-white type-ui-medium px-5 py-2 hover:opacity-90 transition-opacity"
        >
          + Add New
        </Link>
      </div>
      <IssuesList />
    </div>
  );
}
