import Link from "next/link";
import { Button } from "./ui/button";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ArrowUpRight, MoveUpRight } from "lucide-react";

interface WebsiteCardProps {
  title: string;
  description: string;
  link: string;
}
export function WebsiteCard({ title, description, link }: WebsiteCardProps) {
  return (
    <Card className="relative w-full max-w-md mx-auto p-4 border rounded-lg shadow-md overflow-hidden backdrop-blur-lg before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary before:via-primary/20 before:to-foreground/20 before:opacity-50 before:blur-xl before:animate-glow">
      <div className="relative z-10 flex justify-between gap-x-2">
        <div>
          <p className="text-xl font-semibold ">{title}</p>
          <p className="mt-2 text-sm ">{description}</p>
        </div>
        <div>
          <Link className="flex items-center gap-x-2" href={link}>
            <Button>
              <motion.div
                whileHover={{ y: -5, x: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
                className=" flex items-center justify-center"
              >
                Continue
                <ArrowUpRight size={18} />
              </motion.div>
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
