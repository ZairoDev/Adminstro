import Link from "next/link";
import Image from "next/image";

export function CareerHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/careers" aria-label="Zairo careers" className="flex items-center gap-2.5">
          <Image src="/zairo1.png" alt="" width={48} height={48} className="h-11 w-11 object-contain" priority />
          <span className="text-sm font-semibold tracking-tight text-foreground">Zairo</span>
        </Link>
        <Link
          href="/careers"
          className="text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Open roles
        </Link>
      </div>
    </header>
  );
}
