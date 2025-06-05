"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ScoreDisplay from "./ScoreDisplay";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface GameState {
  playerX: number;
  playerY: number;
  playerSize: number;
  wallWidth: number;
  speed: number;
  isOnLeftWall: boolean;
  isJumping: boolean;
  jumpProgress: number;
  timeElapsed: number;
  isGameOver: boolean;
}

// Inline GameOverModal component since the external one isn't available
interface GameOverModalProps {
  timeElapsed: number;
  onRestart: () => void;
  isOpen: boolean;
}

const GameOverModal = ({
  timeElapsed,
  onRestart,
  isOpen = true,
}: GameOverModalProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Game Over!</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-center text-lg">
            Time survived:{" "}
            <span className="font-bold text-primary">
              {formatTime(timeElapsed)}
            </span>
          </p>
        </div>
        <DialogFooter>
          <Button onClick={onRestart} className="w-full">
            Play Again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const router = useRouter();

  const [gameState, setGameState] = useState<GameState>({
    playerX: 50, // Starting position on left wall
    playerY: typeof window !== "undefined" ? window.innerHeight - 200 : 600, // Starting height relative to screen
    playerSize: 30, // Size of the square
    wallWidth: 40, // Width of the walls
    speed: 150, // Pixels per second upward
    isOnLeftWall: true, // Start on left wall
    isJumping: false,
    jumpProgress: 0,
    timeElapsed: 0,
    isGameOver: false,
  });

  // Handle player input (keyboard and touch/click)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault(); // Prevent spacebar from scrolling the page
        if (!gameState.isJumping && !gameState.isGameOver) {
          jump();
        } else if (gameState.isGameOver) {
          restartGame();
        }
      }
    };

    const handleClick = () => {
      if (!gameState.isJumping && !gameState.isGameOver) {
        jump();
      } else if (gameState.isGameOver) {
        restartGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("click", handleClick);
    window.addEventListener("touchstart", handleClick);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("touchstart", handleClick);
    };
  }, [gameState.isJumping, gameState.isGameOver]);

  // Jump function
  const jump = () => {
    setGameState((prev) => ({
      ...prev,
      isJumping: true,
      jumpProgress: 0,
    }));
  };

  // Restart game function
  const restartGame = () => {
    setGameState({
      playerX: 50,
      playerY: typeof window !== "undefined" ? window.innerHeight - 200 : 600,
      playerSize: 30,
      wallWidth: 40,
      speed: 150,
      isOnLeftWall: true,
      isJumping: false,
      jumpProgress: 0,
      timeElapsed: 0,
      isGameOver: false,
    });
  };

  // Game loop
  const gameLoop = (time: number) => {
    if (previousTimeRef.current === undefined) {
      previousTimeRef.current = time;
    }

    const deltaTime = (time - previousTimeRef.current) / 1000; // Convert to seconds
    previousTimeRef.current = time;

    // Update game state
    setGameState((prev) => {
      // If game is over, don't update
      if (prev.isGameOver) return prev;

      // Calculate new position
      let newY = prev.playerY - prev.speed * deltaTime; // Moving upward (decreasing Y)
      let newX = prev.playerX;
      let newIsOnLeftWall = prev.isOnLeftWall;
      let newIsJumping = prev.isJumping;
      let newJumpProgress = prev.jumpProgress;

      // Handle jumping animation
      if (prev.isJumping) {
        newJumpProgress += deltaTime * 5; // Control jump speed

        if (newJumpProgress >= 1) {
          // Jump completed
          newIsJumping = false;
          newIsOnLeftWall = !prev.isOnLeftWall;
          newX = newIsOnLeftWall
            ? prev.wallWidth + 10
            : window.innerWidth - prev.wallWidth - 10 - prev.playerSize;
        } else {
          // Calculate position during jump using easing function
          const startX = prev.isOnLeftWall
            ? prev.wallWidth + 10
            : window.innerWidth - prev.wallWidth - 10 - prev.playerSize;
          const endX = prev.isOnLeftWall
            ? window.innerWidth - prev.wallWidth - 10 - prev.playerSize
            : prev.wallWidth + 10;
          const jumpCurve = -4 * Math.pow(newJumpProgress - 0.5, 2) + 1; // Parabolic curve for jump

          // Interpolate between walls with a slight arc
          newX = startX + (endX - startX) * newJumpProgress;
        }
      } else {
        // Not jumping, stay on wall
        newX = prev.isOnLeftWall
          ? prev.wallWidth + 10
          : window.innerWidth - prev.wallWidth - 10 - prev.playerSize;
      }

      // Check for game over (if player reaches top of screen)
      const isGameOver = newY <= 0;

      // Update time elapsed
      const newTimeElapsed = prev.timeElapsed + deltaTime;

      return {
        ...prev,
        playerX: newX,
        playerY: newY,
        isOnLeftWall: newIsOnLeftWall,
        isJumping: newIsJumping,
        jumpProgress: newJumpProgress,
        timeElapsed: newTimeElapsed,
        isGameOver: isGameOver,
      };
    });

    requestRef.current = requestAnimationFrame(gameLoop);
  };

  // Start and stop game loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Draw game on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions to match viewport
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw walls
    ctx.fillStyle = "#334155"; // Slate-700
    // Left wall
    ctx.fillRect(0, 0, gameState.wallWidth, canvas.height);
    // Right wall
    ctx.fillRect(
      canvas.width - gameState.wallWidth,
      0,
      gameState.wallWidth,
      canvas.height,
    );

    // Draw player
    ctx.fillStyle = gameState.isJumping ? "#f97316" : "#3b82f6"; // Orange when jumping, blue when on wall
    ctx.fillRect(
      gameState.playerX,
      gameState.playerY,
      gameState.playerSize,
      gameState.playerSize,
    );
  }, [gameState]);

  return (
    <div className="fixed inset-0 w-screen h-screen bg-slate-900 overflow-hidden">
      <div className="absolute top-4 left-4 z-10">
        <ScoreDisplay timeElapsed={gameState.timeElapsed} />
      </div>

      <canvas ref={canvasRef} className="w-full h-full bg-slate-800" />

      {gameState.isGameOver && (
        <GameOverModal
          timeElapsed={gameState.timeElapsed}
          onRestart={restartGame}
          isOpen={gameState.isGameOver}
        />
      )}
    </div>
  );
};

export default GameCanvas;
