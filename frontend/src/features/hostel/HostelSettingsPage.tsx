import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/**
 * Hostel operating rules. Rendered as a section inside Organization settings
 * (/settings). Values are display-only defaults in the mock build.
 */
export function HostelSettingsSection() {
  const { toast } = useToast();
  const [noticeDays, setNoticeDays] = useState("30");
  const [dueDay, setDueDay] = useState("10");
  const [lateFine, setLateFine] = useState("50");
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Hostel rules saved", variant: "success" });
    }, 500);
  };

  return (
    <Card>
      <CardHeader
        title="Hostel rules"
        subtitle="Defaults used for dues, notices and fines."
      />
      <CardBody className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Notice period (days)" hint="Before a resident moves out">
            <Input
              type="number"
              min={0}
              value={noticeDays}
              onChange={(e) => setNoticeDays(e.target.value)}
            />
          </FormField>
          <FormField label="Rent due day of month" hint="Dues count from this day">
            <Input type="number" min={1} max={28} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
          </FormField>
          <FormField label="Late fine (₹/day)" hint="After the due day">
            <Input type="number" min={0} value={lateFine} onChange={(e) => setLateFine(e.target.value)} />
          </FormField>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} isLoading={saving} variant="secondary" size="sm">
            Save rules
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
