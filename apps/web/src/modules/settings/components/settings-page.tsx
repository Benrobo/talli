import { useState } from "react";
import { cn } from "@app/ui";
import {
  Button,
  FadeIn,
  Input,
  PageHeader,
  SectionCard,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@/components/ui";
import { useWorkspaces } from "@/modules/workspaces/hooks/use-workspaces";
import { botTones, permissionDefaults } from "@/data/mock/settings";

interface PermissionRow {
  key: keyof typeof permissionDefaults;
  title: string;
  sub: string;
}

const PERMISSION_ROWS: PermissionRow[] = [
  { key: "ownersOnly", title: "Owner & admins only", sub: "Members can only pay, not create" },
  { key: "confirmBeforeSending", title: "Confirm before sending", sub: "Always ask me before money moves" },
  { key: "autoRemind", title: "Auto-remind unpaid", sub: "Nudge every 2 days until the deadline" },
];

export function SettingsPage() {
  const { activeWorkspace } = useWorkspaces();
  const [name, setName] = useState(activeWorkspace?.name ?? "");
  const [currency, setCurrency] = useState("NGN");
  const [permissions, setPermissions] = useState(permissionDefaults);
  const [tone, setTone] = useState(botTones[0]);

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage this workspace and how Talli behaves." />

      <div className="grid grid-cols-2 gap-3.5">
        <FadeIn>
          <SectionCard title="Workspace">
            <div className="flex flex-col gap-4">
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">Name</span>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workspace name" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">Currency</span>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NGN">Nigerian Naira (₦)</SelectItem>
                    <SelectItem value="USD">US Dollar ($)</SelectItem>
                    <SelectItem value="GHS">Ghanaian Cedi (₵)</SelectItem>
                    <SelectItem value="KES">Kenyan Shilling (KSh)</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>
          </SectionCard>
        </FadeIn>

        <FadeIn delay={0.06}>
          <SectionCard title="Permissions">
            <div className="flex flex-col">
              {PERMISSION_ROWS.map((row, index) => (
                <div
                  key={row.key}
                  className={cn(
                    "flex items-center justify-between py-3.5",
                    index === 0 && "pt-0",
                    index < PERMISSION_ROWS.length - 1 && "border-b border-hairline-soft"
                  )}
                >
                  <div className="pr-4">
                    <div className="text-[14px] font-medium">{row.title}</div>
                    <div className="text-[12px] text-content-muted">{row.sub}</div>
                  </div>
                  <Switch
                    checked={permissions[row.key]}
                    onCheckedChange={(next) => setPermissions((prev) => ({ ...prev, [row.key]: next }))}
                  />
                </div>
              ))}
            </div>
          </SectionCard>
        </FadeIn>

        <FadeIn delay={0.12}>
          <SectionCard title="Bot tone">
            <div className="inline-flex w-full rounded-xl bg-muted/60 p-1">
              {botTones.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTone(option)}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-center text-[13px] font-medium transition-all",
                    tone === option ? "bg-card text-foreground shadow-sm" : "text-content-muted"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-content-muted">
              {tone === "Direct" && "Short and to the point. “Opeyemi paid ₦3,000. 4 of 12 in.”"}
              {tone === "Warm" && "Friendly and encouraging. “Nice one — Opeyemi just paid ₦3,000 🎉”"}
              {tone === "Playful" && "Fun and casual. “Kaching! Opeyemi dropped ₦3,000 💸”"}
            </p>
          </SectionCard>
        </FadeIn>

        <FadeIn delay={0.18}>
          <SectionCard title={<span className="text-rose">Danger zone</span>} className="border-rose-soft/60">
            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b border-hairline-soft py-3.5 pt-0">
                <div>
                  <div className="text-[14px] font-medium">Unlink all chats</div>
                  <div className="text-[12px] text-content-muted">Talli stops acting everywhere</div>
                </div>
                <Button variant="destructive" size="sm">
                  Unlink
                </Button>
              </div>
              <div className="flex items-center justify-between py-3.5 pb-0">
                <div>
                  <div className="text-[14px] font-medium">Close workspace</div>
                  <div className="text-[12px] text-content-muted">Owner only · can't be undone</div>
                </div>
                <Button variant="destructive" size="sm">
                  Close
                </Button>
              </div>
            </div>
          </SectionCard>
        </FadeIn>
      </div>
    </div>
  );
}
