import { useState, useCallback } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

interface SendMessageParams {
  to: string;
  message: string;
}

interface SendTemplateParams {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: any[];
}

interface SendMediaParams {
  to: string;
  mediaType: "image" | "document" | "audio" | "video" | "sticker";
  mediaUrl: string;
  caption?: string;
  filename?: string;
}

interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export const useWhatsApp = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const sendMessage = useCallback(
    async ({ to, message }: SendMessageParams): Promise<WhatsAppResponse> => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.post("/api/whatsapp/send-message", {
          to,
          message,
        });

        if (response.data.success) {
          toast({
            title: "Message Sent",
            description: "Your message was delivered successfully",
          });
          return {
            success: true,
            messageId: response.data.messageId,
          };
        } else {
          throw new Error(response.data.error || "Failed to send message");
        }
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error || err.message || "Failed to send message";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const sendTemplateMessage = useCallback(
    async ({
      to,
      templateName,
      languageCode = "en",
      components = [],
    }: SendTemplateParams): Promise<WhatsAppResponse> => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.post("/api/whatsapp/send-template", {
          to,
          templateName,
          languageCode,
          components,
        });

        if (response.data.success) {
          toast({
            title: "Template Sent",
            description: "Your template message was delivered successfully",
          });
          return {
            success: true,
            messageId: response.data.messageId,
          };
        } else {
          throw new Error(response.data.error || "Failed to send template");
        }
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error || err.message || "Failed to send template";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const sendMediaMessage = useCallback(
    async ({
      to,
      mediaType,
      mediaUrl,
      caption,
      filename,
    }: SendMediaParams): Promise<WhatsAppResponse> => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.post("/api/whatsapp/send-media", {
          to,
          mediaType,
          mediaUrl,
          caption,
          filename,
        });

        if (response.data.success) {
          toast({
            title: "Media Sent",
            description: "Your media message was delivered successfully",
          });
          return {
            success: true,
            messageId: response.data.messageId,
          };
        } else {
          throw new Error(response.data.error || "Failed to send media");
        }
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error || err.message || "Failed to send media";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const getTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get("/api/whatsapp/templates");
      if (response.data.success) {
        return response.data.templates;
      } else {
        throw new Error(response.data.error || "Failed to fetch templates");
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || err.message || "Failed to fetch templates";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    sendMessage,
    sendTemplateMessage,
    sendMediaMessage,
    getTemplates,
    loading,
    error,
  };
};
