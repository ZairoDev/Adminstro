"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, X } from "lucide-react";
import axios from "@/util/axios";
import Heading from "@/components/Heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/AuthStore";

type PasswordSource = "database" | "environment" | "missing" | "unreadable";

type Mailbox = {
  key: "general" | "hr";
  label: string;
  description: string;
  loginEmail: string;
  fromEmail: string;
  connectedEmails: string[];
  passwordSource: PasswordSource;
  updatedAt: string | null;
};

type Draft = Mailbox & {
  appPassword: string;
  connectedInput: string;
};

const SOURCE_LABEL: Record<PasswordSource, string> = {
  database: "App password saved",
  environment: "Using environment password",
  missing: "No app password",
  unreadable: "Saved password cannot be read",
};

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function fromOptions(draft: Draft): string[] {
  const options = [draft.loginEmail.trim().toLowerCase(), ...draft.connectedEmails];
  return options.filter((email, index) => email && options.indexOf(email) === index);
}

export default function EmailAccountsPage() {
  const role = useAuthStore((state) => state.token?.role);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get<{ success: boolean; mailboxes: Mailbox[] }>(
        "/api/email-mailboxes",
      );
      setDrafts(
        response.data.mailboxes.map((mailbox) => ({
          ...mailbox,
          appPassword: "",
          connectedInput: "",
        })),
      );
    } catch {
      toast({
        title: "Could not load email accounts",
        description: "Only a superadmin can open this page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role && role !== "SuperAdmin") {
      setLoading(false);
      return;
    }
    void load();
  }, [load, role]);

  function patch(key: Mailbox["key"], update: Partial<Draft>) {
    setDrafts((current) =>
      current.map((draft) => (draft.key === key ? { ...draft, ...update } : draft)),
    );
  }

  function changeLogin(draft: Draft, loginEmail: string) {
    const previous = draft.loginEmail.trim().toLowerCase();
    const next = loginEmail;
    const fromEmail =
      draft.fromEmail.trim().toLowerCase() === previous ? next : draft.fromEmail;
    patch(draft.key, { loginEmail, fromEmail });
  }

  function addConnected(draft: Draft) {
    const email = draft.connectedInput.trim().toLowerCase();
    if (!isEmail(email)) {
      toast({ title: "Enter a valid email address", variant: "destructive" });
      return;
    }
    if (email === draft.loginEmail.trim().toLowerCase()) {
      toast({
        title: "That is already the account email",
        description: "Connected emails are extra addresses this account sends as.",
      });
      return;
    }
    if (draft.connectedEmails.includes(email)) {
      patch(draft.key, { connectedInput: "" });
      return;
    }
    patch(draft.key, {
      connectedEmails: [...draft.connectedEmails, email],
      connectedInput: "",
    });
  }

  function removeConnected(draft: Draft, email: string) {
    const connectedEmails = draft.connectedEmails.filter((item) => item !== email);
    const fromEmail =
      draft.fromEmail.trim().toLowerCase() === email
        ? draft.loginEmail.trim().toLowerCase()
        : draft.fromEmail;
    patch(draft.key, { connectedEmails, fromEmail });
  }

  async function save(draft: Draft, clearSavedPassword = false) {
    setBusyKey(draft.key);
    try {
      const response = await axios.put<{ success: boolean; mailbox: Mailbox }>(
        `/api/email-mailboxes/${draft.key}`,
        {
          loginEmail: draft.loginEmail.trim(),
          fromEmail: draft.fromEmail.trim(),
          connectedEmails: draft.connectedEmails,
          ...(draft.appPassword.trim() && !clearSavedPassword
            ? { appPassword: draft.appPassword.trim() }
            : {}),
          ...(clearSavedPassword ? { clearSavedPassword: true } : {}),
        },
      );
      patch(draft.key, { ...response.data.mailbox, appPassword: "", connectedInput: "" });
      toast({
        title: clearSavedPassword ? "Saved password removed" : `${draft.label} account saved`,
        description: clearSavedPassword
          ? "This account will use the environment password again, if one is set."
          : "New mail will use this account.",
      });
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) &&
        typeof error.response?.data?.message === "string"
          ? error.response.data.message
          : "Could not save this email account";
      toast({ title: "Save failed", description: message, variant: "destructive" });
    } finally {
      setBusyKey(null);
    }
  }

  async function testConnection(draft: Draft) {
    setBusyKey(draft.key);
    try {
      const response = await axios.post<{ success: boolean; message: string }>(
        `/api/email-mailboxes/${draft.key}/verify`,
        {
          loginEmail: draft.loginEmail.trim(),
          ...(draft.appPassword.trim() ? { appPassword: draft.appPassword.trim() } : {}),
        },
      );
      toast({ title: "Connection works", description: response.data.message });
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) &&
        typeof error.response?.data?.message === "string"
          ? error.response.data.message
          : "Gmail rejected this account";
      toast({ title: "Connection failed", description: message, variant: "destructive" });
    } finally {
      setBusyKey(null);
    }
  }

  if (role && role !== "SuperAdmin") {
    return (
      <div className="p-4">
        <Heading
          heading="Email accounts"
          subheading="Only a superadmin can change the Gmail accounts and app passwords."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <Heading
        heading="Email accounts"
        subheading="Each Gmail account has an app password. Connected emails are the extra addresses that account sends as. Gmail must list those addresses under Send mail as."
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading accounts
        </div>
      ) : (
        drafts.map((draft) => {
          const options = fromOptions(draft);
          const busy = busyKey === draft.key;
          return (
            <Card key={draft.key}>
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Mail className="h-4 w-4" />
                    {draft.label}
                  </CardTitle>
                  <Badge variant={draft.passwordSource === "missing" ? "destructive" : "secondary"}>
                    {SOURCE_LABEL[draft.passwordSource]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{draft.description}</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor={`${draft.key}-login`}>Account email</Label>
                  <Input
                    id={`${draft.key}-login`}
                    type="email"
                    autoComplete="off"
                    value={draft.loginEmail}
                    onChange={(event) => changeLogin(draft, event.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`${draft.key}-password`}>App password</Label>
                  <Input
                    id={`${draft.key}-password`}
                    type="password"
                    autoComplete="new-password"
                    placeholder="Leave blank to keep the current password"
                    value={draft.appPassword}
                    onChange={(event) => patch(draft.key, { appPassword: event.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Create this in the Google account under Security, then App passwords.
                    Saving a password here replaces the environment value for this account.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`${draft.key}-connected`}>Connected emails</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`${draft.key}-connected`}
                      type="email"
                      placeholder="name@company.com"
                      value={draft.connectedInput}
                      onChange={(event) =>
                        patch(draft.key, { connectedInput: event.target.value })
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addConnected(draft);
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={() => addConnected(draft)}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {draft.connectedEmails.length === 0 ? (
                      <span className="text-sm text-muted-foreground">
                        No extra addresses. Mail sends as the account email.
                      </span>
                    ) : (
                      draft.connectedEmails.map((email) => (
                        <Badge key={email} variant="outline" className="gap-1 pr-1">
                          {email}
                          <button
                            type="button"
                            className="rounded-sm p-0.5 hover:bg-muted"
                            aria-label={`Remove ${email}`}
                            onClick={() => removeConnected(draft, email)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>From address</Label>
                  {options.length > 0 ? (
                    <Select
                      value={options.includes(draft.fromEmail.trim().toLowerCase())
                        ? draft.fromEmail.trim().toLowerCase()
                        : options[0]}
                      onValueChange={(value) => patch(draft.key, { fromEmail: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose the address recipients see" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((email) => (
                          <SelectItem key={email} value={email}>
                            {email}
                            {email === draft.loginEmail.trim().toLowerCase() ? " (account)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground">Enter the account email first.</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={busy} onClick={() => void save(draft)}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void testConnection(draft)}
                  >
                    Test connection
                  </Button>
                  {draft.passwordSource === "database" || draft.passwordSource === "unreadable" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void save(draft, true)}
                    >
                      Use environment password
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
