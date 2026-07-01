import type { Collection } from "@prisma/client";
import prisma from "../prisma/index.js";
import { collectionService } from "./collection.service.js";
import { paymentService } from "./payment.service.js";
import { BadRequestException } from "../lib/exception.js";
import type { Intent, SplitMode } from "../schemas/intent.schema.js";

export interface SplitShare {
  name: string;
  amount: number;
}

export interface SplitPlan {
  mode: SplitMode;
  title: string;
  total: number;
  shares: SplitShare[];
  perHead?: number;
  count?: number;
}

export interface CreateSplitContext {
  workspaceId: string;
  ownerUserId: string;
  linkedChatId: string;
}

export interface SplitShareLink {
  name: string;
  amount: number;
  checkoutLink: string;
}

export interface CreateSplitResult {
  collection: Collection;
  plan: SplitPlan;
  links: SplitShareLink[];
}

/**
 * Turns a parsed split intent into a concrete plan and a `named_members`
 * collection. Owns the share maths for the three modes — even (divide a total,
 * remainder to the first share), custom (each member's stated amount), and
 * by_count (a total split N ways, unnamed). Payment + reconcile are unchanged:
 * each share becomes a member with its own `expectedAmount`, which the existing
 * pay loop already honours. "me" is resolved to the sender upstream (the
 * dispatcher) before the intent reaches here, so planning is pure name maths.
 */
class SplitService {
  /**
   * Builds the share breakdown from the intent and validates the inputs. Pure — no
   * writes — so the dispatcher can preview it on a confirm card before anything is
   * created. Throws a user-facing message when the split can't be planned.
   */
  plan(intent: Intent): SplitPlan {
    const mode = intent.splitMode;
    if (!mode) throw new BadRequestException("Missing split mode");
    const title = intent.title?.trim() || "Split";

    if (mode === "by_count") return this.planByCount(intent, title);
    if (mode === "custom") return this.planCustom(intent, title);
    return this.planEven(intent, title);
  }

  private planEven(intent: Intent, title: string): SplitPlan {
    const total = intent.amount;
    const people = (intent.members ?? []).map((m) => m.name.trim()).filter(Boolean);
    if (!total) throw new BadRequestException("An even split needs a total amount");
    if (people.length < 2) throw new BadRequestException("An even split needs at least two people");

    const base = Math.floor(total / people.length);
    const remainder = total - base * people.length;
    const shares = people.map((name, i) => ({ name, amount: base + (i === 0 ? remainder : 0) }));
    return { mode: "even", title, total, shares };
  }

  private planCustom(intent: Intent, title: string): SplitPlan {
    const members = (intent.members ?? []).filter((m) => m.name.trim());
    if (members.length < 2) throw new BadRequestException("A custom split needs at least two people");

    const missing = members.filter((m) => !m.amount).map((m) => m.name.trim());
    if (missing.length) {
      throw new BadRequestException(`How much does ${missing.join(" and ")} owe?`);
    }

    const shares = members.map((m) => ({ name: m.name.trim(), amount: m.amount! }));
    const total = shares.reduce((sum, s) => sum + s.amount, 0);
    return { mode: "custom", title, total, shares };
  }

  private planByCount(intent: Intent, title: string): SplitPlan {
    const total = intent.amount;
    const count = intent.count;
    if (!total) throw new BadRequestException("A split needs a total amount");
    if (!count || count < 2) throw new BadRequestException("Tell me how many ways to split it (at least two)");

    const perHead = Math.floor(total / count);
    if (perHead < 1) throw new BadRequestException("That amount is too small to split that many ways");

    return { mode: "by_count", title, total: perHead * count, shares: [], perHead, count };
  }

  /**
   * Creates the collection for a planned split and returns the per-share pay links.
   * Named modes (even, custom) create a `named_members` collection, seed one member
   * per share, and mint a hosted checkout link per member so anyone — on a chat
   * platform or not — can pay that exact share. The by_count mode has no names, so
   * it creates a `fixed_per_person` collection people enrol into by paying (no
   * per-share links; the in-chat Pay button covers it).
   */
  async create(intent: Intent, ctx: CreateSplitContext): Promise<CreateSplitResult> {
    const plan = this.plan(intent);

    if (plan.mode === "by_count") {
      const collection = await collectionService.create(ctx.workspaceId, ctx.ownerUserId, {
        title: plan.title,
        purpose: "",
        collectionType: "fixed_per_person",
        amountPerMember: plan.perHead,
        targetAmount: plan.total,
        linkedChatId: ctx.linkedChatId,
      });
      return { collection, plan, links: [] };
    }

    const collection = await collectionService.create(ctx.workspaceId, ctx.ownerUserId, {
      title: plan.title,
      purpose: "",
      collectionType: "named_members",
      targetAmount: plan.total,
      linkedChatId: ctx.linkedChatId,
    });

    try {
      const links: SplitShareLink[] = [];
      for (const share of plan.shares) {
        const member = await collectionService.addMember(ctx.workspaceId, collection.id, {
          displayName: share.name,
          expectedAmount: share.amount,
        });
        const pending = await paymentService.create({
          purpose: "collection",
          amount: share.amount,
          collectionId: collection.id,
          collectionMemberId: member.id,
        });
        if (!pending.checkoutLink) {
          throw new BadRequestException("Couldn't generate a pay link for this split");
        }
        links.push({ name: share.name, amount: share.amount, checkoutLink: pending.checkoutLink });
      }
      return { collection, plan, links };
    } catch (err) {
      await this.discard(collection.id);
      throw err;
    }
  }

  /**
   * Removes a half-built split collection and its members/pending payments when
   * link-minting fails partway, so a failed split never leaves a payable but
   * incomplete collection behind.
   */
  private async discard(collectionId: string): Promise<void> {
    await prisma.pendingPayment.deleteMany({ where: { collectionId } });
    await prisma.collectionMember.deleteMany({ where: { collectionId } });
    await prisma.collection.delete({ where: { id: collectionId } }).catch(() => {});
  }
}

export const splitService = new SplitService();
export default splitService;
