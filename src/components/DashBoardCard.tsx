"use client";

import { motion } from "framer-motion";
import {
  Zap,
  Shield,
  Smartphone,
  ArrowRight,
  Laptop,
  BetweenVerticalStartIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";

const features = [
  {
    name: "Vacation Saga",
    description: "Things that related to vacationSaga will goes in this route",
    icon: BetweenVerticalStartIcon,
    link: "/dashboard/user",
  },
  {
    name: "Housing Saga",
    description: "Things that related to housingSaga will goes in this route",
    icon: Shield,
    link: "/",
  },
  {
    name: "Tech Tune",
    description: "Things that related to TechTune will goes in this route",
    icon: Smartphone,
    link: "/",
  },
];

export default function DashboardCard() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-3xl  my-4  sm:text-4xl">Our Features</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Choose where you want to go after login.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mt-10"
      >
        <div className="grid grid-cols-1  gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 * (index + 1), duration: 0.5 }}
              className="pt-6"
            >
              <div className="flow-root   border-secondary border  rounded-lg px-6 pb-4">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 text-primary bg-secondary rounded-md shadow-lg">
                      <feature.icon className="h-6 w-6 " aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-medium  tracking-tight">
                    {feature.name}
                  </h3>
                  <p className="my-2 text-base text-muted-foreground">
                    {feature.description}
                  </p>
                  <Link href={feature.link} className="mt-2">
                    <Button>
                      Navigate <ArrowRight size={18} />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
