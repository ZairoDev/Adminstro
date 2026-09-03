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
        </div>
        {children}
      </div>
    </div>
  );
}
