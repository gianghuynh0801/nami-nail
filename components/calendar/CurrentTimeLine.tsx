"use client";

import { useState, useEffect } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { getSalonTz } from "@/lib/timezone";
import { CALENDAR_CONFIG } from "./constants";

interface CurrentTimeLineProps {
  /** Salon timezone (e.g. Europe/Vienna). Red line shows current time in this zone. */
  timezone?: string | null;
}

export default function CurrentTimeLine({ timezone }: CurrentTimeLineProps) {
  const [position, setPosition] = useState(0);
  const tz = getSalonTz(timezone);

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date();
      const hours = parseInt(formatInTimeZone(now, tz, "H"), 10);
      const minutes = parseInt(formatInTimeZone(now, tz, "m"), 10);
      const totalMinutes = hours * 60 + minutes;
      const pos = (totalMinutes / 60) * CALENDAR_CONFIG.HOUR_HEIGHT;
      setPosition(pos);
    };

    updatePosition();
    const interval = setInterval(updatePosition, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [tz]);

  return (
    <div
      className="absolute left-0 right-0 z-30 pointer-events-none"
      style={{ top: position }}
    >
      {/* Red dot */}
      <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full shadow-md" />

      {/* Red line */}
      <div className="h-0.5 bg-red-500 shadow-sm w-full" />
    </div>
  );
}
