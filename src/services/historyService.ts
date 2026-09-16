import {
  ConversationRecord,
  ConversationMessageRecord,
  ConversationContext,
  LocationInfo,
} from "../types.js";
import { getSupabase, isSupabaseConfigured } from "./supabase.js";

export class HistoryService {
  /**
   * List conversations for the authenticated user, ordered by recent activity.
   */
  public async listConversations(userId: string, searchQuery?: string): Promise<ConversationRecord[]> {
    if (!isSupabaseConfigured() || !userId || userId === "guest-user") {
      return [];
    }

    const client = getSupabase();
    if (!client) return [];

    try {
      let query = client
        .from("conversations")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (searchQuery && searchQuery.trim()) {
        query = query.ilike("title", `%${searchQuery.trim()}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.warn("Could not load conversations from Supabase:", error.message);
        return [];
      }
      return (data || []) as ConversationRecord[];
    } catch (err) {
      console.warn("Error in listConversations:", err);
      return [];
    }
  }

  /**
   * Get all messages for a specific conversation.
   */
  public async getConversationMessages(
    conversationId: string
  ): Promise<ConversationMessageRecord[]> {
    if (!isSupabaseConfigured() || !conversationId) {
      return [];
    }

    const client = getSupabase();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from("conversation_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("Could not load messages from Supabase:", error.message);
        return [];
      }
      return (data || []) as ConversationMessageRecord[];
    } catch (err) {
      console.warn("Error in getConversationMessages:", err);
      return [];
    }
  }

  /**
   * Create a new conversation session.
   */
  public async createConversation(
    userId: string,
    data: {
      title?: string;
      location?: LocationInfo;
      language?: string;
    }
  ): Promise<ConversationRecord | null> {
    if (!isSupabaseConfigured() || !userId || userId === "guest-user") {
      return null;
    }

    const client = getSupabase();
    if (!client) return null;

    try {
      const newTitle = data.title || (data.location ? `${data.location.name} Weather` : "Weather Discussion");
      const { data: conv, error } = await client
        .from("conversations")
        .insert({
          user_id: userId,
          title: newTitle,
          location_name: data.location?.name || null,
          latitude: data.location?.latitude || null,
          longitude: data.location?.longitude || null,
          timezone: data.location?.timezone || "UTC",
          language: data.language || "en",
        })
        .select("*")
        .single();

      if (error) {
        console.warn("Failed to create conversation in Supabase:", error.message);
        return null;
      }
      return conv as ConversationRecord;
    } catch (err) {
      console.warn("Error creating conversation:", err);
      return null;
    }
  }

  /**
   * Add a message to an existing conversation.
   */
  public async addMessage(
    userId: string,
    conversationId: string,
    message: {
      role: "user" | "assistant";
      content: string;
      language?: string;
      is_ai_generated?: boolean;
      context?: ConversationContext;
      weather_data?: any;
    }
  ): Promise<ConversationMessageRecord | null> {
    if (!isSupabaseConfigured() || !userId || userId === "guest-user" || !conversationId) {
      return null;
    }

    const client = getSupabase();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from("conversation_messages")
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          role: message.role,
          content: message.content,
          language: message.language || null,
          is_ai_generated: Boolean(message.is_ai_generated),
          context: message.context || null,
          weather_data: message.weather_data || null,
        })
        .select("*")
        .single();

      if (error) {
        console.warn("Failed to save conversation message to Supabase:", error.message);
        return null;
      }

      // Update conversation's updated_at timestamp
      await client
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId)
        .eq("user_id", userId);

      return data as ConversationMessageRecord;
    } catch (err) {
      console.warn("Error adding message:", err);
      return null;
    }
  }

  /**
   * Update an existing message's localized content and language.
   */
  public async updateMessageContent(
    messageId: string,
    content: string,
    language: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured() || !messageId) {
      return false;
    }

    const client = getSupabase();
    if (!client) return false;

    try {
      const { error } = await client
        .from("conversation_messages")
        .update({ content, language })
        .eq("id", messageId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Update conversation title.
   */
  public async updateConversationTitle(
    userId: string,
    conversationId: string,
    title: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId || userId === "guest-user") {
      return false;
    }

    const client = getSupabase();
    if (!client) return false;

    try {
      const { error } = await client
        .from("conversations")
        .update({ title: title.trim(), updated_at: new Date().toISOString() })
        .eq("id", conversationId)
        .eq("user_id", userId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Delete an individual conversation and all its messages.
   */
  public async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId || userId === "guest-user") {
      return false;
    }

    const client = getSupabase();
    if (!client) return false;

    try {
      const { error } = await client
        .from("conversations")
        .delete()
        .eq("id", conversationId)
        .eq("user_id", userId);

      return !error;
    } catch (err) {
      console.warn("Error deleting conversation:", err);
      return false;
    }
  }

  /**
   * Clear all conversations for the user.
   */
  public async clearAllHistory(userId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId || userId === "guest-user") {
      return false;
    }

    const client = getSupabase();
    if (!client) return false;

    try {
      const { error } = await client
        .from("conversations")
        .delete()
        .eq("user_id", userId);

      return !error;
    } catch (err) {
      console.warn("Error clearing history:", err);
      return false;
    }
  }

  /**
   * Generate an informative, human-readable title from query text and location.
   */
  public generateTitle(firstQuery: string, location?: LocationInfo): string {
    const locName = location?.name || "";
    const clean = firstQuery.trim().replace(/[?!.,]+$/, "");

    if (!clean) {
      return locName ? `${locName} Weather` : "Weather Discussion";
    }

    if (clean.length <= 40) {
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    }

    if (locName) {
      if (/rain|barish|precipitation/i.test(clean)) return `${locName} Rain Forecast`;
      if (/temperature|temp|garmi|sardi/i.test(clean)) return `${locName} Temperature Analysis`;
      if (/wind|storm|cyclone/i.test(clean)) return `${locName} Wind & Advisory`;
      if (/run|outdoor|cricket|football|sport/i.test(clean)) return `${locName} Outdoor Activity`;
      if (/travel|trip|drive|route/i.test(clean)) return `${locName} Travel Weather`;
      return `${locName} Weather Inquiry`;
    }

    return clean.slice(0, 36) + "...";
  }
}

export const historyService = new HistoryService();
