"use client";

import { useState, type ReactNode } from "react";
import axios from "@/util/axios";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  EXPENSE_CATEGORIES,
  FREQUENCY_LABELS,
  RECURRING_FREQUENCIES,
  type ExpenseCategory,
  type ExpenseLine,
  type RecurringFrequency,
} from "@/modules/finance/expense-sheet";
import { apiErrorMessage, readAmount } from "./expense-api";

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function CategorySelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: ExpenseCategory;
  onChange: (value: ExpenseCategory) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as ExpenseCategory)}>
      <SelectTrigger id={id} className="h-10 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {EXPENSE_CATEGORIES.map((category) => (
          <SelectItem key={category} value={category}>
            {category}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FrequencySelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: RecurringFrequency;
  onChange: (value: RecurringFrequency) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as RecurringFrequency)}>
      <SelectTrigger id={id} className="h-10 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RECURRING_FREQUENCIES.map((frequency) => (
          <SelectItem key={frequency} value={frequency}>
            {FREQUENCY_LABELS[frequency]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FormFooter({
  saving,
  submitLabel,
  onCancel,
}: {
  saving: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" className="h-10 cursor-pointer" disabled={saving} onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" className="h-10 cursor-pointer" disabled={saving}>
        {saving ? "Saving…" : submitLabel}
      </Button>
    </DialogFooter>
  );
}

type DialogShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
};

function DialogShell({ open, onOpenChange, title, description, children }: DialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/* One-off expense: add or edit */

export function ExpenseFormDialog({
  open,
  onOpenChange,
  month,
  monthLabel,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  monthLabel: string;
  editing: ExpenseLine | null;
  onSaved: () => void;
}) {
  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Edit expense" : "Add expense"}
      description={
        editing ? `Change this one-off expense for ${monthLabel}.` : `A one-off expense for ${monthLabel} only.`
      }
    >
      {open ? (
        <ExpenseForm
          key={editing?.id ?? "new"}
          month={month}
          editing={editing}
          onCancel={() => onOpenChange(false)}
          onSaved={() => {
            onOpenChange(false);
            onSaved();
          }}
        />
      ) : null}
    </DialogShell>
  );
}

function ExpenseForm({
  month,
  editing,
  onCancel,
  onSaved,
}: {
  month: string;
  editing: ExpenseLine | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(editing?.category ?? "Other");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [vendor, setVendor] = useState(editing?.vendor ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const parsedAmount = readAmount(amount);
    if (!title.trim()) return setError("Enter a name for this expense.");
    if (parsedAmount === null) return setError("Enter the amount in rupees, like 2500 or 2500.50.");
    setSaving(true);
    setError(null);
    try {
      const payload = { title: title.trim(), category, amount: parsedAmount, vendor: vendor.trim(), notes: notes.trim() };
      if (editing) await axios.patch(`/api/finance/expenses/${editing.id}`, payload);
      else await axios.post("/api/finance/expenses", { ...payload, month });
      onSaved();
    } catch (saveError) {
      setError(apiErrorMessage(saveError, "Could not save this expense."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Field id="expense-title" label="Name">
        <Input id="expense-title" value={title} onChange={(event) => setTitle(event.target.value)} className="h-10 text-base" maxLength={120} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="expense-category" label="Category">
          <CategorySelect id="expense-category" value={category} onChange={setCategory} />
        </Field>
        <Field id="expense-amount" label="Amount (Rs.)">
          <Input id="expense-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="h-10 text-base" />
        </Field>
      </div>
      <Field id="expense-vendor" label="Vendor or payee (optional)">
        <Input id="expense-vendor" value={vendor} onChange={(event) => setVendor(event.target.value)} className="h-10 text-base" maxLength={120} />
      </Field>
      <Field id="expense-notes" label="Notes (optional)">
        <Textarea id="expense-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={2} />
      </Field>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <FormFooter saving={saving} submitLabel={editing ? "Save changes" : "Add expense"} onCancel={onCancel} />
    </form>
  );
}

/* Recurring expense: add */

export function RecurringFormDialog({
  open,
  onOpenChange,
  month,
  minMonth,
  maxMonth,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  minMonth: string;
  maxMonth: string;
  onSaved: () => void;
}) {
  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Add recurring expense"
      description="A fixed expense that repeats on its own every month, quarter, or year, such as rent or software."
    >
      {open ? (
        <RecurringForm
          month={month}
          minMonth={minMonth}
          maxMonth={maxMonth}
          onCancel={() => onOpenChange(false)}
          onSaved={() => {
            onOpenChange(false);
            onSaved();
          }}
        />
      ) : null}
    </DialogShell>
  );
}

function RecurringForm({
  month,
  minMonth,
  maxMonth,
  onCancel,
  onSaved,
}: {
  month: string;
  minMonth: string;
  maxMonth: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("Rent");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [startMonth, setStartMonth] = useState(month);
  const [endMonth, setEndMonth] = useState("");
  const [vendor, setVendor] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const parsedAmount = readAmount(amount);
    if (!title.trim()) return setError("Enter a name for this expense.");
    if (parsedAmount === null) return setError("Enter the amount in rupees, like 25000.");
    if (!startMonth) return setError("Choose the month it starts.");
    if (endMonth && endMonth < startMonth) return setError("The end month cannot be before the start month.");
    setSaving(true);
    setError(null);
    try {
      await axios.post("/api/finance/recurring-expenses", {
        title: title.trim(),
        category,
        amount: parsedAmount,
        frequency,
        startMonth,
        endMonth: endMonth || null,
        vendor: vendor.trim(),
        notes: notes.trim(),
      });
      onSaved();
    } catch (saveError) {
      setError(apiErrorMessage(saveError, "Could not save this recurring expense."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Field id="recurring-title" label="Name">
        <Input id="recurring-title" value={title} onChange={(event) => setTitle(event.target.value)} className="h-10 text-base" maxLength={120} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="recurring-category" label="Category">
          <CategorySelect id="recurring-category" value={category} onChange={setCategory} />
        </Field>
        <Field id="recurring-amount" label="Amount each time (Rs.)">
          <Input id="recurring-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="h-10 text-base" />
        </Field>
      </div>
      <Field id="recurring-frequency" label="Repeats">
        <FrequencySelect id="recurring-frequency" value={frequency} onChange={setFrequency} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="recurring-start" label="Starts">
          <Input id="recurring-start" type="month" min={minMonth} max={maxMonth} value={startMonth} onChange={(event) => setStartMonth(event.target.value)} className="h-10 text-base" />
        </Field>
        <Field id="recurring-end" label="Ends (optional)" hint="Leave empty to keep repeating.">
          <Input id="recurring-end" type="month" min={startMonth || minMonth} value={endMonth} onChange={(event) => setEndMonth(event.target.value)} className="h-10 text-base" />
        </Field>
      </div>
      <Field id="recurring-vendor" label="Vendor or payee (optional)">
        <Input id="recurring-vendor" value={vendor} onChange={(event) => setVendor(event.target.value)} className="h-10 text-base" maxLength={120} />
      </Field>
      <Field id="recurring-notes" label="Notes (optional)">
        <Textarea id="recurring-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={2} />
      </Field>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <FormFooter saving={saving} submitLabel="Add recurring expense" onCancel={onCancel} />
    </form>
  );
}

/* Recurring expense: edit details and amount */

type AmountScope = "onward" | "monthOnly";

export function EditRecurringDialog({
  line,
  month,
  monthLabel,
  onClose,
  onSaved,
}: {
  line: ExpenseLine | null;
  month: string;
  monthLabel: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <DialogShell
      open={line !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Edit recurring expense"
      description={`Details apply to every month. The amount can change from ${monthLabel} onward or for this month only.`}
    >
      {line ? (
        <EditRecurringForm
          key={`${line.id}-${month}`}
          line={line}
          month={month}
          monthLabel={monthLabel}
          onCancel={onClose}
          onSaved={() => {
            onClose();
            onSaved();
          }}
        />
      ) : null}
    </DialogShell>
  );
}

function EditRecurringForm({
  line,
  month,
  monthLabel,
  onCancel,
  onSaved,
}: {
  line: ExpenseLine;
  month: string;
  monthLabel: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(line.title);
  const [category, setCategory] = useState<ExpenseCategory>(line.category);
  const [frequency, setFrequency] = useState<RecurringFrequency>(line.frequency ?? "monthly");
  const [vendor, setVendor] = useState(line.vendor);
  const [notes, setNotes] = useState(line.notes);
  const [amount, setAmount] = useState(String(line.amount));
  const [scope, setScope] = useState<AmountScope>("onward");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (resetOverride: boolean) => {
    const parsedAmount = readAmount(amount);
    if (!title.trim()) return setError("Enter a name for this expense.");
    if (!resetOverride && parsedAmount === null) return setError("Enter the amount in rupees, like 25000.");
    setSaving(true);
    setError(null);
    try {
      const detailsChanged =
        title.trim() !== line.title ||
        category !== line.category ||
        frequency !== line.frequency ||
        vendor.trim() !== line.vendor ||
        notes.trim() !== line.notes;
      if (detailsChanged) {
        await axios.patch(`/api/finance/recurring-expenses/${line.id}`, {
          action: "details",
          title: title.trim(),
          category,
          frequency,
          vendor: vendor.trim(),
          notes: notes.trim(),
        });
      }
      if (resetOverride) {
        await axios.put(`/api/finance/recurring-expenses/${line.id}/months/${month}`, { amountOverride: null });
      } else if (parsedAmount !== null && parsedAmount !== line.amount) {
        if (scope === "onward") {
          await axios.patch(`/api/finance/recurring-expenses/${line.id}`, {
            action: "amount",
            fromMonth: month,
            amount: parsedAmount,
          });
          if (line.overridden) {
            await axios.put(`/api/finance/recurring-expenses/${line.id}/months/${month}`, { amountOverride: null });
          }
        } else {
          await axios.put(`/api/finance/recurring-expenses/${line.id}/months/${month}`, {
            amountOverride: parsedAmount,
          });
        }
      }
      onSaved();
    } catch (saveError) {
      setError(apiErrorMessage(saveError, "Could not save this recurring expense."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void save(false);
      }}
    >
      <Field id="edit-recurring-title" label="Name">
        <Input id="edit-recurring-title" value={title} onChange={(event) => setTitle(event.target.value)} className="h-10 text-base" maxLength={120} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="edit-recurring-category" label="Category">
          <CategorySelect id="edit-recurring-category" value={category} onChange={setCategory} />
        </Field>
        <Field id="edit-recurring-frequency" label="Repeats">
          <FrequencySelect id="edit-recurring-frequency" value={frequency} onChange={setFrequency} />
        </Field>
      </div>
      <Field id="edit-recurring-vendor" label="Vendor or payee (optional)">
        <Input id="edit-recurring-vendor" value={vendor} onChange={(event) => setVendor(event.target.value)} className="h-10 text-base" maxLength={120} />
      </Field>
      <Field id="edit-recurring-notes" label="Notes (optional)">
        <Textarea id="edit-recurring-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={2} />
      </Field>
      <Field
        id="edit-recurring-amount"
        label={`Amount for ${monthLabel} (Rs.)`}
        hint={line.overridden ? `The standard amount is ${line.baseAmount}. This month has its own amount.` : undefined}
      >
        <Input id="edit-recurring-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="h-10 text-base" />
      </Field>
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">If the amount changed</legend>
        {(
          [
            ["onward", `From ${monthLabel} onward (earlier months keep their amount)`],
            ["monthOnly", `${monthLabel} only`],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" name="amount-scope" checked={scope === value} onChange={() => setScope(value)} className="size-4" />
            {label}
          </label>
        ))}
      </fieldset>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <DialogFooter className="gap-2">
        {line.overridden ? (
          <Button type="button" variant="outline" className="h-10 cursor-pointer" disabled={saving} onClick={() => void save(true)}>
            Use standard amount
          </Button>
        ) : null}
        <Button type="button" variant="outline" className="h-10 cursor-pointer" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="h-10 cursor-pointer" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* Confirm */

export type ConfirmRequest = {
  title: string;
  description: string;
  confirmLabel: string;
  run: () => Promise<void>;
};

const INVOICE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_INVOICE_BYTES = 10 * 1024 * 1024;

function invoiceFileName(file: File): string {
  const cleaned = file.name.replace(/[^\w.\- ]+/g, "").trim().slice(0, 160);
  return cleaned || "invoice";
}

/** Asks for the invoice, uploads it, then marks the expense paid. */
export function MarkPaidDialog({
  line,
  month,
  onClose,
  onSaved,
}: {
  line: ExpenseLine | null;
  month: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Dialog
      open={line !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit the invoice</DialogTitle>
          <DialogDescription>
            {line
              ? `${line.title} can be marked paid only after its invoice is uploaded. PDF, JPEG, PNG, or WEBP, up to 10 MB.`
              : "Upload the invoice."}
          </DialogDescription>
        </DialogHeader>
        {line ? (
          <MarkPaidForm
            key={line.id}
            line={line}
            month={month}
            onCancel={onClose}
            onSaved={() => {
              onClose();
              onSaved();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function MarkPaidForm({
  line,
  month,
  onCancel,
  onSaved,
}: {
  line: ExpenseLine;
  month: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { uploadFiles, loading } = useBunnyUpload();
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!file) {
      setError("Choose the invoice file.");
      return;
    }
    if (!INVOICE_TYPES.includes(file.type)) {
      setError("Use a PDF, JPEG, PNG, or WEBP invoice.");
      return;
    }
    if (file.size > MAX_INVOICE_BYTES) {
      setError("The invoice must be 10 MB or smaller.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { imageUrls, error: uploadError } = await uploadFiles([file], "ExpenseInvoices");
      const invoiceUrl = imageUrls[0];
      if (uploadError || !invoiceUrl) {
        setError(uploadError || "The invoice did not upload. Try again.");
        return;
      }
      const payload = { status: "paid" as const, invoiceUrl, invoiceName: invoiceFileName(file) };
      if (line.source === "recurring") {
        await axios.put(`/api/finance/recurring-expenses/${line.id}/months/${month}`, payload);
      } else {
        await axios.patch(`/api/finance/expenses/${line.id}`, payload);
      }
      onSaved();
    } catch (saveError) {
      setError(apiErrorMessage(saveError, "Could not mark this paid."));
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || loading;

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Field id="expense-invoice" label="Invoice">
        <Input
          id="expense-invoice"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="h-10 cursor-pointer text-sm file:mr-3 file:cursor-pointer"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setError(null);
          }}
        />
      </Field>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <FormFooter saving={busy} submitLabel="Upload and mark paid" onCancel={onCancel} />
    </form>
  );
}

export function ConfirmDialog({
  request,
  onClose,
}: {
  request: ConfirmRequest | null;
  onClose: () => void;
}) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (!request) return;
    setWorking(true);
    setError(null);
    try {
      await request.run();
      onClose();
    } catch (runError) {
      setError(apiErrorMessage(runError, "That did not work. Try again."));
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open && !working) {
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{request?.title}</DialogTitle>
          <DialogDescription>{request?.description}</DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" className="h-10 cursor-pointer" disabled={working} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" className="h-10 cursor-pointer" disabled={working} onClick={() => void confirm()}>
            {working ? "Working…" : request?.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
