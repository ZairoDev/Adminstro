import { useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LayoutTemplate, Loader2, MessageSquare, Check, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Template } from "../types";
import { getTemplateParameters } from "../utils";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  templates: Template[];
  templatesLoading: boolean;
  selectedTemplate: Template | null;
  onSelectTemplate: (template: Template | null) => void;
  templateParams: Record<string, string>;
  onTemplateParamsChange: (params: Record<string, string>) => void;
  onSend: () => void;
  sendingMessage: boolean;
  triggerDisabled?: boolean;
  context?: {
    clientName?: string;
    locationName?: string;
  };
}

export const TemplateDialog = memo(function TemplateDialog({
  open,
  onOpenChange,
  templates,
  selectedTemplate,
  onSelectTemplate,
  templateParams,
  onTemplateParamsChange,
  onSend,
  sendingMessage,
  context,
}: TemplateDialogProps) {
  const params = useMemo(
    () => (selectedTemplate ? getTemplateParameters(selectedTemplate) : []),
    [selectedTemplate]
  );

  const approvedTemplates = useMemo(
    () => templates.filter((t) => t.status === "APPROVED"),
    [templates]
  );

  const handleSelectTemplate = (templateName: string) => {
    const template = templates.find((t) => t.name === templateName);
    onSelectTemplate(template || null);
    if (!template) {
      onTemplateParamsChange({});
      return;
    }

    // Prefill parameters based on context
    const meta = getTemplateParameters(template);
    const nextParams: Record<string, string> = {};

    const bodyParams = meta
      .filter((p) => p.type === "body")
      .sort((a, b) => a.index - b.index);

    const headerParams = meta
      .filter((p) => p.type === "header")
      .sort((a, b) => a.index - b.index);

    const clientName = context?.clientName || "";
    const locationName = context?.locationName || "";

    if (bodyParams[0] && clientName) {
      nextParams[`body_${bodyParams[0].index}`] = clientName;
    }
    if (bodyParams[1] && locationName) {
      nextParams[`body_${bodyParams[1].index}`] = locationName;
    }

    if (headerParams[0] && clientName) {
      nextParams[`header_${headerParams[0].index}`] = clientName;
    }

    onTemplateParamsChange(nextParams);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 bg-white dark:bg-[#111b21] border-[#e9edef] dark:border-[#222d34] overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#222d34]">
          <DialogTitle className="flex items-center gap-3 text-[#111b21] dark:text-[#e9edef]">
            <div className="w-10 h-10 rounded-full bg-[#25d366] flex items-center justify-center">
              <LayoutTemplate className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[16px] font-medium">Send Template Message</p>
              <p className="text-[13px] font-normal text-[#667781] dark:text-[#8696a0]">
                Pre-approved messages for outside 24h window
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-6 space-y-5">
            {/* Template selector */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[#54656f] dark:text-[#8696a0]">
                Select Template
              </label>
              <Select
                value={selectedTemplate?.name || ""}
                onValueChange={handleSelectTemplate}
              >
                <SelectTrigger className="w-full h-11 bg-white dark:bg-[#2a3942] border-[#e9edef] dark:border-[#374045] rounded-lg">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] bg-white dark:bg-[#2a3942] border-[#e9edef] dark:border-[#374045]">
                  {approvedTemplates.map((template) => (
                    <SelectItem
                      key={template.name}
                      value={template.name}
                      className="cursor-pointer py-3 hover:bg-[#f0f2f5] dark:hover:bg-[#374045]"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-[#111b21] dark:text-[#e9edef]">
                          {template.name}
                        </span>
                        <span className="text-xs text-[#667781] dark:text-[#8696a0]">
                          {template.category} • {template.language}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            {selectedTemplate && (
              <div className="rounded-lg overflow-hidden border border-[#e9edef] dark:border-[#374045]">
                <div className="bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-2.5 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#25d366]" />
                  <span className="text-[13px] font-medium text-[#54656f] dark:text-[#8696a0]">
                    Message Preview
                  </span>
                </div>
                <div className="p-4 bg-[#efeae2] dark:bg-[#0b141a]">
                  <div className="bg-[#d9fdd3] dark:bg-[#005c4b] rounded-lg p-3 max-w-[85%] ml-auto shadow-sm">
                    {selectedTemplate.components?.find((c: any) => c.type === "HEADER")?.text && (
                      <p className="font-semibold text-[14px] text-[#111b21] dark:text-[#e9edef] mb-2">
                        {(() => {
                          const headerComp = selectedTemplate.components.find((c: any) => c.type === "HEADER");
                          let text = headerComp.text;
                          const matches = text.match(/\{\{(\d+)\}\}/g);
                          if (matches) {
                            matches.forEach((match: string) => {
                              const index = parseInt(match.replace(/[{}]/g, ""));
                              const paramValue = templateParams[`header_${index}`];
                              text = text.replace(match, paramValue || `[Parameter ${index}]`);
                            });
                          }
                          return text;
                        })()}
                      </p>
                    )}
                    {selectedTemplate.components?.find((c: any) => c.type === "BODY")?.text && (
                      <p className="text-[14.2px] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap">
                        {(() => {
                          const bodyComp = selectedTemplate.components.find((c: any) => c.type === "BODY");
                          let text = bodyComp.text;
                          const matches = text.match(/\{\{(\d+)\}\}/g);
                          if (matches) {
                            matches.forEach((match: string) => {
                              const index = parseInt(match.replace(/[{}]/g, ""));
                              const paramValue = templateParams[`body_${index}`];
                              text = text.replace(match, paramValue ? `*${paramValue}*` : `[Parameter ${index}]`);
                            });
                          }
                          return text;
                        })()}
                      </p>
                    )}
                    {selectedTemplate.components?.find((c: any) => c.type === "FOOTER")?.text && (
                      <p className="text-[11px] text-[#667781] dark:text-[#8696a0] mt-2">
                        {selectedTemplate.components.find((c: any) => c.type === "FOOTER")?.text}
                      </p>
                    )}
                    {selectedTemplate.components?.find((c: any) => c.type === "BUTTONS") && (
                      <div className="mt-3 pt-2 border-t border-[#c7f8ca] dark:border-[#025144]">
                        {selectedTemplate.components
                          .find((c: any) => c.type === "BUTTONS")
                          ?.buttons?.map((btn: any, i: number) => (
                            <div key={i} className="text-center py-1.5 text-[14px] text-[#53bdeb] font-medium">
                              {btn.text}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-2 flex items-center justify-between text-[12px]">
                  <span className="text-[#667781] dark:text-[#8696a0]">
                    Category: {selectedTemplate.category}
                  </span>
                  <span className="flex items-center gap-1 text-[#25d366]">
                    <Check className="h-3 w-3" />
                    Approved
                  </span>
                </div>
              </div>
            )}

            {/* Parameters */}
            {selectedTemplate && params.length > 0 && (
              <div className="space-y-4 p-4 rounded-lg bg-[#f0f2f5] dark:bg-[#202c33]">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-[#54656f] dark:text-[#8696a0]">
                    Fill in parameters
                  </span>
                  <span className="bg-[#25d366]/10 text-[#25d366] px-2 py-0.5 rounded text-[11px] font-medium">
                    {params.length} required
                  </span>
                </div>
                {params.map((param) => (
                  <div key={`${param.type}_${param.index}`} className="space-y-1.5">
                    <label className="text-[12px] font-medium text-[#667781] dark:text-[#8696a0] flex items-center gap-2">
                      <span className="bg-white dark:bg-[#2a3942] px-2 py-0.5 rounded text-[11px] border border-[#e9edef] dark:border-[#374045]">
                        {`{{${param.index}}}`}
                      </span>
                      <span className="truncate">{param.text || `Parameter ${param.index}`}</span>
                    </label>
                    <Input
                      placeholder="Enter value..."
                      value={templateParams[`${param.type}_${param.index}`] || ""}
                      onChange={(e) =>
                        onTemplateParamsChange({
                          ...templateParams,
                          [`${param.type}_${param.index}`]: e.target.value,
                        })
                      }
                      className="h-10 bg-white dark:bg-[#2a3942] border-[#e9edef] dark:border-[#374045] rounded-lg"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Send button */}
            <Button
              className="w-full h-11 bg-[#25d366] hover:bg-[#1da851] text-white rounded-lg text-[15px] font-medium"
              onClick={() => {
                onSend();
                onOpenChange(false);
              }}
              disabled={!selectedTemplate || sendingMessage}
            >
              {sendingMessage ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <LayoutTemplate className="h-5 w-5 mr-2" />
              )}
              Send Template Message
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});
