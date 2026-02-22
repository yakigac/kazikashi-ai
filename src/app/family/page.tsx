import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import FamilyClient from "./FamilyClient";

export default async function FamilyPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <FamilyClient currentUserId={session.user.id} />;
}
