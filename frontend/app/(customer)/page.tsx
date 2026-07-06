import { unstable_noStore as noStore } from "next/cache";
import CustomerHomePage from "./CustomerHomePage";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default function Page() {
  noStore();
  return <CustomerHomePage />;
}
