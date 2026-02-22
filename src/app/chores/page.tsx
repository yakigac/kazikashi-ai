import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChoresClient from "./ChoresClient";

export default async function ChoresPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <ChoresClient />;
}
