import { useState } from "react";
import { cn } from "@app/ui";
import { Button, Card, Toggle } from "@/components/ui";
import { ArrowDown01Icon, Icon, Tick02Icon } from "@app/icons";
import { useWorkspaces } from "@/modules/workspaces/hooks/use-workspaces";
import { botTones, permissionDefaults } from "@/data/mock/settings";

interface PermissionRow {
  key: keyof typeof permissionDefaults;
  title: string;
  sub: string;
}

const PERMISSION_ROWS: PermissionRow[] = [
  { key: "ownersOnly", title: "Owner & admins", sub: "Members can only pay" },
  {
    key: "confirmBeforeSending",
    title: "Confirm before sending",
    sub: "Always ask me before money moves",
  },
  {
    key: "autoRemind",
    title: "Auto-remind unpaid",
    sub: "Nudge every 2 days until deadline",
  },
];

const SECTION_LABEL =
  "mb-3.5 font-mono text-[10px] uppercase tracking-[0.08em]";

/** Workspace settings (screen 2h). */
export function SettingsPage() {
  const { activeWorkspace } = useWorkspaces();
  const [permissions, setPermissions] = useState(permissionDefaults);
  const [tone, setTone] = useState(botTones[0]);

  return (
    <div>
      <h1 className="mb-6 font-serif text-[31px] font-normal leading-none">
        Settings
      </h1>

      <div className="grid grid-cols-2 gap-3.5">
        <Card>
          <div className={cn(SECTION_LABEL, "text-content-faint")}>Workspace</div>
          <div className="mb-3.5">
            <div className="mb-1.5 text-[12px] text-content-muted">Name</div>
            <div className="rounded-[10px] border border-hairline bg-screen p-3 font-medium">
              {activeWorkspace?.name ?? "—"}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[12px] text-content-muted">Currency</div>
            <div className="flex items-center justify-between rounded-[10px] border border-hairline bg-screen p-3 font-medium">
              <span>Nigerian Naira (₦)</span>
              <Icon data={ArrowDown01Icon} size={16} className="text-content-faint" />
            </div>
          </div>
        </Card>

        <Card>
          <div className={cn(SECTION_LABEL, "text-content-faint")}>
            Who can create collections
          </div>
          {PERMISSION_ROWS.map((row, index) => (
            <div
              key={row.key}
              className={cn(
                "flex items-center justify-between py-3",
                index < PERMISSION_ROWS.length - 1 &&
                  "border-b border-hairline-soft"
              )}
            >
              <div>
                <div className="text-[14px] font-medium">{row.title}</div>
                <div className="text-[12px] text-content-muted">{row.sub}</div>
              </div>
              <Toggle
                checked={permissions[row.key]}
                onChange={(next) =>
                  setPermissions((prev) => ({ ...prev, [row.key]: next }))
                }
                label={row.title}
              />
            </div>
          ))}
        </Card>

        <Card>
          <div className={cn(SECTION_LABEL, "text-content-faint")}>Bot tone</div>
          <div className="flex gap-2.5">
            {botTones.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTone(option)}
                className={cn(
                  "flex-1 rounded-[10px] p-3 text-center text-[13px] font-medium transition-colors",
                  tone === option
                    ? "bg-iris text-white shadow-btn"
                    : "border border-hairline bg-screen text-content-muted"
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="mt-3.5 flex items-center gap-1.5 rounded-[10px] border border-hairline bg-screen p-3 text-[12.5px] text-content-muted">
            <Icon data={Tick02Icon} size={14} className="text-iris-deep" />
            Opeyemi paid ₦3,000 · 4 of 12 · ₦24,000 to go
          </div>
        </Card>

        <Card className="border-rose-soft">
          <div className={cn(SECTION_LABEL, "text-rose")}>Danger zone</div>
          <div className="mb-3.5 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-medium">Unlink all chats</div>
              <div className="text-[12px] text-content-muted">
                Talli stops acting everywhere
              </div>
            </div>
            <Button variant="danger" size="sm">
              Unlink
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px] font-medium">Close workspace</div>
              <div className="text-[12px] text-content-muted">
                Owner only · can't be undone
              </div>
            </div>
            <Button variant="danger" size="sm">
              Close
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
