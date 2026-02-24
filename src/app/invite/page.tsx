import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import InviteClient from "./InviteClient";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function InvitePage({ searchParams }: Props) {
  const session = await auth();
  const { token } = await searchParams;

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/invite?token=${token}`);
  }

  if (!token) {
    redirect("/");
  }

  return <InviteClient token={token} />;
}
