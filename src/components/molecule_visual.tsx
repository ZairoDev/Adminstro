"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";

interface CityData {
  city: string;
  registeredCount: number;
  unregisteredCount: number;

  // New breakdown fields
  unregisteredWithImages: number;
  unregisteredWithReferenceLink: number;
  unregisteredWithBoth: number;
  unregisteredWithNone: number;
}

interface TotalsData {
  totalRegistered: number;
  totalUnregistered: number;

  // New breakdown fields
  totalUnregisteredWithImages: number;
  totalUnregisteredWithReferenceLink: number;
  totalUnregisteredWithBoth: number;
  totalUnregisteredWithNone: number;
}

interface RegistrationData {
  byCity: CityData[];
  totals: TotalsData[];
}

interface MoleculeVisualizationProps {
  data: RegistrationData;
}

export function MoleculeVisualization({ data }: MoleculeVisualizationProps) {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(
    null
  );

  const centerX = 300;
  const centerY = 300;
  const coreRadius = 70;
  const satelliteRadius = 50;
  const orbitRadius = 150;

  const totals = data.totals[0] || {
    totalRegistered: 0,
    totalUnregistered: 0,
    totalUnregisteredWithImages: 0,
    totalUnregisteredWithReferenceLink: 0,
    totalUnregisteredWithBoth: 0,
    totalUnregisteredWithNone: 0,
  };

  const totalUsers = totals.totalRegistered + totals.totalUnregistered;
  const registrationRate =
    totalUsers > 0
      ? ((totals.totalRegistered / totalUsers) * 100).toFixed(1)
      : "0";

  // Process cities and replace blank names with "Unknown"
  const cityPositions = useMemo(
    () =>
      data.byCity.map((city, index) => {
        const angle = (index * 360) / data.byCity.length;
        const radian = (angle * Math.PI) / 180;
        const x = centerX + Math.cos(radian) * orbitRadius;
        const y = centerY + Math.sin(radian) * orbitRadius;

        const displayCity = city.city?.trim() === "" ? "Unknown" : city.city;

        return {
          ...city,
          city: displayCity,
          uniqueKey: `${displayCity}-${index}`,
          x,
          y,
        };
      }),
    [data.byCity]
  );

  const hoveredCityData = hoveredCity
    ? data.byCity.find(
        (c) => (c.city?.trim() === "" ? "Unknown" : c.city) === hoveredCity
      )
    : null;

  return (
    <div className="relative w-full h-full  flex items-center justify-center">
      {/* SVG Diagram */}
      <svg viewBox="0 0 600 600" className="w-full h-full">
        {/* Orbit Circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={orbitRadius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeDasharray="4 6"
          opacity="0.3"
        />

        {/* Connections */}
        {cityPositions.map((city) => (
          <line
            key={`bond-${city.uniqueKey}`}
            x1={centerX}
            y1={centerY}
            x2={city.x}
            y2={city.y}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="1"
            opacity={hoveredCity === city.city ? "0.8" : "0.4"}
          />
        ))}

        {/* Core Circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={coreRadius}
          fill="hsl(var(--secondary))"
          stroke="hsl(var(--secondary))"
          strokeWidth="3"
          opacity="0.8"
        />

        {/* Satellites */}
        {cityPositions.map((city) => {
          const cityTotal = city.registeredCount + city.unregisteredCount;
          const cityRate =
            cityTotal > 0 ? (city.registeredCount / cityTotal) * 100 : 0;
          const satelliteColor =
            cityRate > 50 ? "hsl(var(--chart-1))" : "hsl(var(--chart-2))";

          return (
            <g
              key={city.uniqueKey}
              onMouseEnter={() => {
                setHoveredCity(city.city);
                setHoverPos({ x: city.x, y: city.y });
              }}
              onMouseLeave={() => {
                setHoveredCity(null);
                setHoverPos(null);
              }}
              style={{ cursor: "pointer", transition: "transform 0.2s ease" }}
            >
              {/* Satellite Circle */}
              <circle
                cx={city.x}
                cy={city.y}
                r={satelliteRadius}
                fill={satelliteColor}
                stroke={
                  hoveredCity === city.city
                    ? "hsl(var(--primary))"
                    : satelliteColor
                }
                strokeWidth={hoveredCity === city.city ? 3 : 2}
                opacity="0.9"
              />

              {/* City Name */}
              <text
                x={city.x}
                y={city.y - satelliteRadius - 8}
                textAnchor="middle"
                className="text-sm font-bold fill-white pointer-events-none"
              >
                {city.city || "Unknown"}
              </text>

              {/* City Count */}
              <text
                x={city.x}
                y={city.y + 5}
                textAnchor="middle"
                className="text-sm font-mono fill-white pointer-events-none"
              >
                {cityTotal}
              </text>
            </g>
          );
        })}

        {/* Central Text */}
        <text
          x={centerX}
          y={centerY - 10}
          textAnchor="middle"
          className="text-lg font-bold fill-white"
        >
          TOTAL
        </text>
        <text
          x={centerX}
          y={centerY + 5}
          textAnchor="middle"
          className="text-sm font-mono fill-white"
        >
          {totalUsers.toLocaleString()}
        </text>
        <text
          x={centerX}
          y={centerY + 20}
          textAnchor="middle"
          className="text-sm font-mono fill-primary"
        >
          {registrationRate}% REG
        </text>
      </svg>

      {/* Hover Card next to Satellite */}
      {hoveredCity && hoveredCityData && hoverPos && (
        <Card
          className="absolute p-4 shadow-lg bg-stone-950 border border-gray-400"
          style={{
            top: hoverPos.y + 20,
            left: hoverPos.x + 20,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            minWidth: "180px",
          }}
        >
          <h3 className="font-semibold text-lg text-primary">
            {hoveredCity || "Unknown"}
          </h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Registered:</span>
              <span className="text-green-500 font-mono">
                {hoveredCityData.registeredCount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Unregistered:</span>
              <span className="text-red-500 font-mono">
                {hoveredCityData.unregisteredCount}
              </span>
            </div>

            {/* New breakdown */}
            <div className="border-t border-gray-200 pt-1 mt-1 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Images only:</span>
                <span className="text-yellow-400 font-mono">
                  {hoveredCityData.unregisteredWithImages}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ref link only:</span>
                <span className="text-blue-400 font-mono">
                  {hoveredCityData.unregisteredWithReferenceLink}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Both:</span>
                <span className="text-purple-400 font-mono">
                  {hoveredCityData.unregisteredWithBoth}
                </span>
              </div>
            </div>

            <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
              <span className="text-gray-500">Rate:</span>
              <span className="text-primary font-bold">
                {(
                  (hoveredCityData.registeredCount /
                    (hoveredCityData.registeredCount +
                      hoveredCityData.unregisteredCount)) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
