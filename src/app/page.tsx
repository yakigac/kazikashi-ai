import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import HomeClient from "@/components/HomeClient";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <HomeClient currentUserId={session.user.id} />;
}
