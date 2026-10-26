import { redirect } from "next/navigation";

// The old temporary page. The feed is now the main page.
export default function AccountPage() {
  redirect("/feed");
}
