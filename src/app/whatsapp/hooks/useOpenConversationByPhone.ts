import { useEffect, useRef } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import axios from "@/util/axios";
import type { Conversation } from "../types";
import {
  insertConversationAtCorrectPosition,
  repositionConversationAfterUpdate,
} from "../lib/whatsappQueryCache";
import {
  WHATSAPP_DEEP_LINK_PARAMS,
  parseWhatsAppDeepLink,
  type WhatsAppDeepLink,
} from "../lib/whatsappInboxUrl";

type ToastOptions = {
  title: string;
  description: string;
  variant?: "default" | "destructive";
};

type UseOpenConversationByPhoneParams = {
  /** False until the viewer is authenticated. */
  enabled: boolean;
  searchParams: ReadonlyURLSearchParams | null;
  /** Replaces the URL (used to clear the one-shot deep-link params). */
  replaceUrl: (url: string) => void;
  patchConversationsList: (mutator: (list: Conversation[]) => Conversation[]) => void;
  selectConversation: (conversation: Conversation | null) => void;
  notify: (options: ToastOptions) => void;
};

type ApiErrorBody = { error?: string; code?: string };

function readApiError(error: unknown, fallback: string): string {
  const body = (error as { response?: { data?: ApiErrorBody } })?.response?.data;
  return typeof body?.error === "string" && body.error ? body.error : fallback;
}

type UnifiedLookupResponse = {
  success?: boolean;
  results?: {
    conversations?: Array<{
      conversationId: string;
      matches?: { phoneMatchType?: "exact" | "suffix" | "contains" };
    }>;
    startNewChat?: { leadLocation?: string };
  };
};

/**
 * Phone-only links (notifications) carry no location. Ask the permission-aware
 * search endpoint for an exact existing chat, or a lead location to create one.
 */
async function lookupByPhone(
  phone: string,
): Promise<{ conversationId?: string; leadLocation?: string }> {
  const { data } = await axios.get<UnifiedLookupResponse>(
    "/api/whatsapp/search/unified",
    { params: { query: phone, limit: 5 } },
  );
  const results = data?.results;
  const exact = results?.conversations?.find((c) => c.matches?.phoneMatchType === "exact");
  return {
    conversationId: exact?.conversationId,
    leadLocation: results?.startNewChat?.leadLocation,
  };
}

async function fetchConversationById(conversationId: string): Promise<Conversation | null> {
  const { data } = await axios.get<{ success?: boolean; conversations?: Conversation[] }>(
    "/api/whatsapp/conversations",
    { params: { conversation: conversationId } },
  );
  return data?.success ? (data.conversations?.[0] ?? null) : null;
}

async function createOrOpenConversation(
  link: WhatsAppDeepLink,
  location: string,
): Promise<Conversation> {
  const resolve = await axios.get<{ phoneNumberId?: string }>(
    "/api/whatsapp/resolve-phone-for-location",
    {
      params: {
        location,
        ...(link.conversationType ? { conversationType: link.conversationType } : {}),
        ...(link.rentalType ? { rentalType: link.rentalType } : {}),
      },
    },
  );
  const phoneNumberId = resolve.data?.phoneNumberId;
  if (!phoneNumberId) {
    throw new Error(`No WhatsApp line configured for ${location}`);
  }

  // POST is find-or-create (deduped by phone + channel) and enforces the caller's
  // visibility rules, so no client-side list scan is needed.
  const created = await axios.post<{ success?: boolean; conversation?: Conversation }>(
    "/api/whatsapp/conversations",
    {
      participantPhone: link.phone,
      participantName: link.name || link.phone,
      phoneNumberId,
      participantLocation: location,
      location,
      conversationType: link.conversationType,
      ...(link.rentalType ? { rentalType: link.rentalType } : {}),
      ...(link.profilePic ? { participantProfilePic: link.profilePic } : {}),
    },
  );
  const conversation = created.data?.conversation;
  if (!created.data?.success || !conversation) {
    throw new Error("Failed to open conversation");
  }

  if (link.conversationType && conversation.conversationType !== link.conversationType) {
    try {
      await axios.post(`/api/whatsapp/conversations/${conversation._id}/meta`, {
        conversationType: link.conversationType,
      });
      return { ...conversation, conversationType: link.conversationType };
    } catch {
      // Non-blocking: still open the thread.
    }
  }
  return conversation;
}

/**
 * Opens a chat from `/whatsapp?phone=...` deep links (lead buttons, owner sheet,
 * notifications, search "Start chat"). One-shot: the deep-link params are removed
 * from the URL when the attempt finishes, so the same link can be used again.
 */
export function useOpenConversationByPhone({
  enabled,
  searchParams,
  replaceUrl,
  patchConversationsList,
  selectConversation,
  notify,
}: UseOpenConversationByPhoneParams): void {
  const inFlightKeyRef = useRef<string | null>(null);

  // Latest callbacks without re-running the effect.
  const handlersRef = useRef({ replaceUrl, patchConversationsList, selectConversation, notify });
  handlersRef.current = { replaceUrl, patchConversationsList, selectConversation, notify };

  const paramsKey = searchParams?.toString() ?? "";

  useEffect(() => {
    if (!enabled) return;
    const link = parseWhatsAppDeepLink(searchParams);
    if (!link) return;

    const key = WHATSAPP_DEEP_LINK_PARAMS.map((p) => searchParams?.get(p) ?? "").join("|");
    if (inFlightKeyRef.current === key) return;
    inFlightKeyRef.current = key;

    const clearDeepLinkParams = () => {
      // Read the live URL: filters may have been synced while the attempt was running.
      const next = new URLSearchParams(window.location.search);
      for (const param of WHATSAPP_DEEP_LINK_PARAMS) next.delete(param);
      const qs = next.toString();
      handlersRef.current.replaceUrl(qs ? `/whatsapp?${qs}` : "/whatsapp");
    };

    const show = (conversation: Conversation) => {
      const { patchConversationsList: patch, selectConversation: select } = handlersRef.current;
      patch((prev) => {
        if (prev.some((c) => c._id === conversation._id)) {
          return repositionConversationAfterUpdate(prev, conversation._id, () => conversation, {
            reposition: false,
          });
        }
        return insertConversationAtCorrectPosition(prev, conversation);
      });
      select(conversation);
    };

    void (async () => {
      try {
        let location = link.location;

        if (!location) {
          const found = await lookupByPhone(link.phone);
          if (found.conversationId) {
            const existing = await fetchConversationById(found.conversationId);
            if (existing) {
              show(existing);
              return;
            }
          }
          location = found.leadLocation ?? "";
        }

        if (!location) {
          handlersRef.current.notify({
            title: "Cannot open chat",
            description: "No chat or lead location found for this number in your area.",
            variant: "destructive",
          });
          return;
        }

        show(await createOrOpenConversation(link, location));
      } catch (error) {
        console.error("Error opening conversation by phone", error);
        handlersRef.current.notify({
          title: "Cannot open chat",
          description: readApiError(error, "Failed to open conversation"),
          variant: "destructive",
        });
      } finally {
        inFlightKeyRef.current = null;
        clearDeepLinkParams();
      }
    })();
    // searchParams is read through paramsKey so identity changes do not re-run the attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, paramsKey]);
}
