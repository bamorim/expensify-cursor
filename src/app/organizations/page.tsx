import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { CreateOrganizationForm } from "./_components/create-organization-form";

export default async function OrganizationsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight">
          <span className="text-[hsl(280,100%,70%)]">Organizations</span>
        </h1>

        <div className="mb-8 text-center text-lg text-white/80">
          Create a new organization or join an existing one to start managing
          expenses
        </div>

        <div className="w-full max-w-md">
          <CreateOrganizationForm />
        </div>
      </div>
    </main>
  );
}
