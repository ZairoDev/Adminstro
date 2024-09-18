import Link from "next/link";
import { Button } from "./ui/button";
import { Card } from "@/components/ui/card";
import { MoveUpRight } from "lucide-react";

interface WebsiteCardProps {
  title: string;
  description: string;
  link: string;
}

export function WebsiteCard({ title, description, link }: WebsiteCardProps) {
  return (
    <Card className="w-full max-w-md mx-auto p-4 border rounded-lg shadow-md ">
      <div className="flex justify-between gap-x-2">
        <div>
          <p className="text-xl font-semibold ">{title}</p>
          <p className="mt-2 text-sm ">{description}</p>
        </div>
        <div>
          <Button className="mt-6 w-full ">
            <Link className="flex items-center gap-x-2" href={link}>
              Continue
              <MoveUpRight className="h-5" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
