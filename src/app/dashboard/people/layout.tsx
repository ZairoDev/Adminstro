export default function PeopleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">People</h1>
          <p className="text-muted-foreground">
            Pipeline candidates, onboarding, active employees, and people who
            have exited
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
