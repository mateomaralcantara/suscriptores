import { NewOrderPanel } from "@/components/NewOrderPanel";
import { PageHeader } from "@/components/PageHeader";

export default function NewOrderPage() {
  return (
    <>
      <PageHeader
        title="New order"
        description="Search, filter, calculate and submit orders through the sandbox provider workflow."
      />
      <NewOrderPanel />
    </>
  );
}
