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
        <h1 className="my-4 text-4xl text-white sm:text-5xl">Our Products</h1>
        <p className="mt-4 text-xl text-white/85">
          Choose where you belong.
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
              <div className="flow-root rounded-xl border border-white/35 bg-sky-950/60 px-6 pb-5 shadow-lg backdrop-blur-md">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center rounded-md bg-white p-3 text-black shadow-lg">
                      <feature.icon className="h-6 w-6 " aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-medium tracking-tight text-white [text-shadow:none]">
                    {feature.name}
                  </h3>
                  <p className="my-2 text-lg leading-relaxed text-white/90 [text-shadow:none]">
                    {feature.description}
                  </p>
                  <Link href={feature.link} className="mt-2">
                    <Button className="h-11 bg-white px-4 text-base text-black shadow-md [text-shadow:none] hover:bg-white/90 hover:text-black">
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
