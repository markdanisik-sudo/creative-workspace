import { redirect } from "next/navigation";

// The proxy sends signed-out visitors to /sign-in; everyone else lands on their projects.
export default function Home() {
  redirect("/projects");
}
