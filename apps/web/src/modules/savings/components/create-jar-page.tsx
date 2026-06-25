import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "@app/ui";
import { Button, Card, Field, Input } from "@/components/ui";
import { ArrowLeft01Icon, Icon } from "@app/icons";

const LOCK_OPTIONS = ["Dec 31", "3 months", "No lock"];

/** New savings jar — name, target, and optional lock (screen 4b). */
export function CreateJarPage() {
  const navigate = useNavigate();
  const [target, setTarget] = useState("₦500,000");
  const [selectedLock, setSelectedLock] = useState(0);

  return (
    <div>
      <Link
        to="/savings"
        className="mb-[18px] inline-flex items-center gap-1.5 text-[13px] text-content-muted"
      >
        <Icon data={ArrowLeft01Icon} size={15} />
        Savings jars
      </Link>

      <h1 className="mb-6 font-serif text-[25px] leading-none">New savings jar</h1>

      <Field label="WHAT ARE YOU SAVING FOR?" className="mb-5">
        <Input defaultValue="Laptop" />
      </Field>

      <Field label="TARGET AMOUNT" className="mb-5">
        <Input value={target} onChange={(event) => setTarget(event.target.value)} />
      </Field>

      <div className="mb-[9px] font-mono text-[10.5px] uppercase tracking-[0.1em] text-content-faint">
        Lock until (optional)
      </div>
      <div className="mb-6 flex gap-2">
        {LOCK_OPTIONS.map((option, index) => (
          <button
            key={option}
            type="button"
            onClick={() => setSelectedLock(index)}
            className={cn(
              "flex-1 rounded-[11px] py-3 text-center text-[13px] font-medium",
              index === selectedLock
                ? "bg-iris text-white shadow-btn"
                : "border border-hairline bg-card text-content-muted"
            )}
          >
            {option}
          </button>
        ))}
      </div>

      <Card tone="night" className="mb-6">
        <div className="mb-2 text-[12.5px] text-content-muted">
          Or just tell Talli in chat:
        </div>
        <div className="font-mono text-[12.5px] leading-[1.55] text-[#c9b7ff]">
          create a laptop jar, target ₦500k, lock till December
        </div>
      </Card>

      <Button block size="lg" onClick={() => navigate({ to: "/savings" })}>
        Create jar
      </Button>
    </div>
  );
}
