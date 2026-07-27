import { Link } from "react-router-dom";
import { AlarmClock, BarChart3, BedDouble, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";

const reports = [
  {
    type: "occupancy",
    title: "Occupancy report",
    description: "Room-by-room capacity, occupied and vacant beds.",
    icon: BedDouble,
  },
  {
    type: "dues",
    title: "Dues report",
    description: "All outstanding amounts, sorted by severity.",
    icon: AlarmClock,
  },
  {
    type: "residents",
    title: "Resident list",
    description: "Full list of active residents with contact details.",
    icon: Users,
  },
  {
    type: "collections",
    title: "Monthly collection",
    description: "Rent, deposits and other collections by month.",
    icon: BarChart3,
  },
];

export function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Filter by date and download each report as a PDF"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {reports.map((r) => (
          <Link key={r.type} to={`/reports/${r.type}`}>
            <Card className="h-full transition-colors hover:border-accent">
              <CardBody className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/5">
                  <r.icon className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{r.description}</p>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
