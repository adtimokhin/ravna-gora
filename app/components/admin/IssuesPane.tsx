import { Link } from "../../../i18n/navigation";
import { IssuesList } from "./IssuesList";
import { PlusIcon } from "./icons";

export function IssuesPane() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="type-h3 text-black">Newspaper Issues</h2>
        <Link
          href="/admin/issues/new"
          className="cursor-pointer inline-flex items-center gap-2 bg-blue-2 text-white type-ui-medium px-5 py-2 hover:opacity-90 transition-opacity"
        >
          <PlusIcon className="w-4 h-4" />
          Add New
        </Link>
      </div>
      <IssuesList />
    </div>
  );
}
