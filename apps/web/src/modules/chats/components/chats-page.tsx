import { Link } from "@tanstack/react-router";
import { Button, Card, PageHeader } from "@/components/ui";
import { Icon, PlusSignIcon } from "@app/icons";
import { PlatformTile } from "@/modules/chats/components/platform-tile";
import { linkedChats } from "@/data/mock/chats";

/** Linked chats — where Talli can act for this workspace (screen 2g). */
export function ChatsPage() {
  return (
    <div>
      <PageHeader
        title="Linked chats"
        subtitle="Where Talli can act for this workspace."
        actions={
          <Link to="/setup">
            <Button leadingIcon={<Icon data={PlusSignIcon} size={16} />}>
              Link a chat
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-3">
        {linkedChats.map((chat) => (
          <Card key={chat.id} className="flex items-center gap-4">
            <PlatformTile platform={chat.platform} />
            <div className="flex-1">
              <div className="text-[14.5px] font-medium">{chat.title}</div>
              <div className="text-[12.5px] text-content-muted">{chat.meta}</div>
            </div>
            <span className="flex items-center gap-2 text-[12.5px] text-iris-deep">
              <span className="size-[7px] rounded-full bg-iris" />
              Active
            </span>
            <Button variant="secondary" size="sm">
              Manage
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
