import { ContractList } from "@/components/ContractList";
import { getContracts } from "@/lib/api";

export const dynamic = 'force-dynamic'; // Ensure fresh data

export default async function Home() {
  const contracts = await getContracts();
  return (
    <>
      <ContractList contracts={contracts} />
    </>
  );
}
