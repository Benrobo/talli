import { useState } from "react";
import { motion } from "motion/react";
import { Button, Card, Input } from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import { PlusSignIcon, UserIcon } from "@benrobo/iconary/core/duotone-rounded";
import { formatNaira } from "@/lib/format";

export function NameStep({
  knownNames,
  value,
  onChange,
  onBack,
  onConfirm,
  submitting,
  error,
  amount,
  isOpenContribution,
}: {
  knownNames: string[];
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onConfirm: (name: string) => void;
  submitting: boolean;
  error: string | null;
  amount: number;
  isOpenContribution: boolean;
}) {
  const [typing, setTyping] = useState(knownNames.length === 0);

  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}>
      <div className="mb-8 text-center">
        {!isOpenContribution ? (
          <div className="mb-1.5 text-[13px] text-content-muted">
            Paying {formatNaira(amount > 0 ? amount : 0)}
          </div>
        ) : null}
        <div className="text-[24px] font-extrabold leading-tight tracking-[-0.03em]">Who's paying?</div>
      </div>

      {!typing && knownNames.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {knownNames.map((name) => (
            <Card key={name} onClick={() => onConfirm(name)} className="flex cursor-pointer items-center gap-3 p-3.5">
              <span className="flex size-9 items-center justify-center rounded-full bg-iris-soft text-iris-deep">
                <Icon icon={UserIcon} size={17} />
              </span>
              <span className="flex-1 text-[14.5px] font-medium">{name}</span>
            </Card>
          ))}
          <button
            onClick={() => setTyping(true)}
            className="mt-1 flex items-center justify-center gap-1.5 text-[13px] font-medium text-iris-deep"
          >
            <Icon icon={PlusSignIcon} size={14} />
            Someone else
          </button>
        </div>
      ) : (
        <div>
          <Input
            autoFocus
            placeholder="Your name"
            value={value}
            invalid={!!error}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && value.trim() && onConfirm(value.trim())}
          />
          {error ? <p className="mt-2 text-[12.5px] text-destructive">{error}</p> : null}
          <Button
            block
            size="lg"
            className="mt-4"
            disabled={!value.trim()}
            loading={submitting}
            onClick={() => onConfirm(value.trim())}
          >
            Continue
          </Button>
          {knownNames.length > 0 ? (
            <button
              onClick={() => setTyping(false)}
              className="mt-3 block w-full text-center text-[13px] text-content-muted"
            >
              Back to list
            </button>
          ) : null}
        </div>
      )}

      <button onClick={onBack} className="mt-6 block w-full text-center text-[13px] text-content-faint">
        ← Back to collection
      </button>
    </motion.div>
  );
}
