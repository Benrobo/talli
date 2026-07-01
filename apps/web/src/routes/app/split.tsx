import { createFileRoute } from "@tanstack/react-router";
import { BillUploadWidget } from "@/modules/bill-split/components/bill-upload-widget";

export const Route = createFileRoute("/app/split")({
  component: SplitPage,
});

function SplitPage() {
  return (
    <div className="flex flex-1 items-start justify-center px-6 py-12">
      <BillUploadWidget />
    </div>
  );
}
