import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { authApi } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
  });

  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["me"] });
      toast.success("Signed out");
      navigate({ to: "/auth" });
    },
  });

  return (
    <main className="min-h-dvh flex items-start justify-center p-8">
      <section className="w-full max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted">Dashboard</p>
            <h1 className="text-2xl font-semibold">Welcome{user?.name ? `, ${user.name}` : ""}</h1>
          </div>
          <button
            onClick={() => logout.mutate()}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-subtle"
          >
            Sign out
          </button>
        </header>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">Signed in as</p>
          <p className="font-medium">{user?.email}</p>
        </div>
      </section>
    </main>
  );
}
