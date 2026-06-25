import { Link } from "@tanstack/react-router";
import { Button, PageHeader } from "@/components/ui";
import { Icon, PlusSignIcon } from "@app/icons";
import { jars } from "@/data/mock/savings";
import { JarCard } from "@/modules/savings/components/jar-card";

/** Savings jars list — every jar at a glance (screen 2d). */
export function SavingsPage() {
  return (
    <div>
      <PageHeader
        title="Savings jars"
        subtitle="₦59,000 saved across 3 jars"
        actions={
          <Link to="/savings/new">
            <Button leadingIcon={<Icon data={PlusSignIcon} size={16} />}>
              New jar
            </Button>
          </Link>
        }
      />
      <div className="grid grid-cols-3 gap-3.5">
        {jars.map((jar) => (
          <JarCard key={jar.id} jar={jar} />
        ))}
      </div>
    </div>
  );
}
