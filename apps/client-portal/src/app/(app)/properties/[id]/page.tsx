import { PropertyDetailPage } from "../../../../screens/PropertyDetailPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PropertyDetailPage propertyId={id} />;
}
