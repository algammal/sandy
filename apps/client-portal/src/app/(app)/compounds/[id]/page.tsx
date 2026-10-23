import { CompoundDetailPage } from "../../../../screens/CompoundDetailPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CompoundDetailPage compoundId={id} />;
}
