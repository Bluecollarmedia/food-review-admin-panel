import { redirect } from "next/navigation";

// The whole app is the admin panel; the root just forwards into it. (The proxy
// also redirects "/" → "/admin"; this is a safe fallback.)
export default function Home() {
  redirect("/admin");
}
