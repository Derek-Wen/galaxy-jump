"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface ScoreDisplayProps {
  timeElapsed?: number;
}

const ScoreDisplay = ({ timeElapsed = 0 }: ScoreDisplayProps) => {
  // Format time as minutes:seconds
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="bg-background border-2 border-primary w-[150px] shadow-lg">
      <CardContent className="p-4 flex flex-col items-center">
        <div className="w-full text-center">
          <div className="mb-2">
            <span className="text-sm font-medium">Time</span>
          </div>
          <div>
            <span className="text-xl font-bold text-primary font-mono">
              {formatTime(timeElapsed)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScoreDisplay;
