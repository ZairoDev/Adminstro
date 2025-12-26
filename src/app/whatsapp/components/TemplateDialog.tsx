import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LayoutTemplate, Loader2, MessageSquare } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Template } from "../types";
import { getTemplateParameters } from "../utils";

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
}

export function TemplateDialog({
  open,
  onOpenChange,
  templates,
  selectedTemplate,
  onSelectTemplate,
  templateParams,
  onTemplateParamsChange,
  onSend,
  sendingMessage,
  triggerDisabled,
}: TemplateDialogProps) {
  const params = useMemo(
    () => (selectedTemplate ? getTemplateParameters(selectedTemplate) : []),
    [selectedTemplate]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Send Template Message" disabled={triggerDisabled}>
          <LayoutTemplate className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-green-500" />
            Send Template Message
          </DialogTitle>
          <DialogDescription>
            Choose a pre-approved template to send. Templates allow you to message customers outside the 24-hour window.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Template</label>
            <Select
              value={selectedTemplate?.name || ""}
              onValueChange={(value) => {
                const template = templates.find((t) => t.name === value);
                onSelectTemplate(template || null);
                onTemplateParamsChange({});
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {templates
                  .filter((t) => t.status === "APPROVED")
                  .map((template) => (
                    <SelectItem key={template.name} value={template.name} className="cursor-pointer">
                      <div className="flex flex-col">
                        <span className="font-medium">{template.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {template.category} • {template.language}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplate && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-green-50 dark:bg-green-900/20 px-3 py-2 border-b">
                <p className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  Message Preview
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-gray-900">
                <div className="bg-green-100 dark:bg-green-800/30 rounded-lg p-3 max-w-[90%] ml-auto">
                  {selectedTemplate.components?.find((c: any) => c.type === "HEADER")?.text && (
                    <p className="font-semibold text-sm mb-1">
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
                    <p className="text-sm whitespace-pre-wrap">
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
                    <p className="text-xs text-muted-foreground mt-2">
                      {selectedTemplate.components.find((c: any) => c.type === "FOOTER")?.text}
                    </p>
                  )}
                  {selectedTemplate.components?.find((c: any) => c.type === "BUTTONS") && (
                    <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-700">
                      {selectedTemplate.components
                        .find((c: any) => c.type === "BUTTONS")
                        ?.buttons?.map((btn: any, i: number) => (
                          <div key={i} className="text-center py-1 text-sm text-blue-500 font-medium">
                            {btn.text}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-muted px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
                <span>Category: {selectedTemplate.category}</span>
                <Badge variant="outline" className="text-green-500 border-green-500">
                  {selectedTemplate.status}
                </Badge>
              </div>
            </div>
          )}

          {selectedTemplate && params.length > 0 && (
            <div className="space-y-3 border rounded-lg p-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded text-xs">
                  {params.length} parameter(s)
                </span>
                Fill in the values below
              </p>
              {params.map((param) => (
                <div key={`${param.type}_${param.index}`} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <span className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">
                      {`{{${param.index}}}`}
                    </span>
                    {param.text}
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
                    className="bg-background"
                  />
                </div>
              ))}
            </div>
          )}

          <Button
            className="w-full bg-green-500 hover:bg-green-600"
            onClick={() => {
              onSend();
              onOpenChange(false);
            }}
            disabled={!selectedTemplate || sendingMessage}
          >
            {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LayoutTemplate className="h-4 w-4 mr-2" />}
            Send Template Message
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

