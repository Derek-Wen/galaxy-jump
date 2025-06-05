"use client";

import { useEffect, useState } from "react";
import GameCanvas from "@/components/game/GameCanvas";
import ScoreDisplay from "@/components/game/ScoreDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function Home() {
  return (
    <main className="w-screen h-screen overflow-hidden">
      <GameCanvas />
    </main>
  );
}
