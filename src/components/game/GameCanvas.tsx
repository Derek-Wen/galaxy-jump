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

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  isOnLeftWall: boolean;
}

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
  obstacles: Obstacle[];
  lastObstacleTime: number;
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
    playerX: 30, // Starting position on left wall
    playerY:
      typeof window !== "undefined" ? window.innerHeight * 0.7 - 15 : 400, // Lower on screen
    playerSize: 30, // Size of the square
    wallWidth: 30, // Width of the walls
    speed: 150, // Pixels per second upward (not used anymore)
    isOnLeftWall: true, // Start on left wall
    isJumping: false,
    jumpProgress: 0,
    timeElapsed: 0,
    isGameOver: false,
    obstacles: [],
    lastObstacleTime: 0,
  });

  const [worldOffset, setWorldOffset] = useState(0);

  // Handle player input (keyboard and touch/click)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault(); // Prevent spacebar from scrolling the page
        if (!gameState.isJumping) {
          jump();
        } else {
          // Check if player is in mid-air and within the white line
          const centerX = window.innerWidth / 2;
          const whiteLineWidth = 20; // Width of the white line zone
          const playerCenterX = gameState.playerX + gameState.playerSize / 2;

          if (
            playerCenterX >= centerX - whiteLineWidth / 2 &&
            playerCenterX <= centerX + whiteLineWidth / 2
          ) {
            returnToSameWall();
          }
        }
      }
    };

    const handleClick = () => {
      if (!gameState.isJumping) {
        jump();
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
  }, [gameState.isJumping]);

  // Jump function
  const jump = () => {
    setGameState((prev) => ({
      ...prev,
      isJumping: true,
      jumpProgress: 0,
    }));
  };

  // Return to same wall function
  const returnToSameWall = () => {
    setGameState((prev) => ({
      ...prev,
      isJumping: true,
      jumpProgress: 0,
      // Keep the same wall instead of switching
    }));
  };

  // Restart game function
  const restartGame = () => {
    setGameState({
      playerX: 30,
      playerY:
        typeof window !== "undefined" ? window.innerHeight * 0.7 - 15 : 400,
      playerSize: 30,
      wallWidth: 40,
      speed: 150,
      isOnLeftWall: true,
      isJumping: false,
      jumpProgress: 0,
      timeElapsed: 0,
      isGameOver: false,
      obstacles: [],
      lastObstacleTime: 0,
    });
    setWorldOffset(0);
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

      // Keep Y position stationary lower on screen
      let newY = window.innerHeight * 0.7 - prev.playerSize / 2; // Lower position
      let newX = prev.playerX;
      let newIsOnLeftWall = prev.isOnLeftWall;
      let newIsJumping = prev.isJumping;
      let newJumpProgress = prev.jumpProgress;

      // Handle jumping animation
      if (prev.isJumping) {
        newJumpProgress += deltaTime * 2.5; // Slower jump speed for more control

        if (newJumpProgress >= 1) {
          // Jump completed
          newIsJumping = false;
          // Check if this is a return jump (staying on same wall)
          const centerX = window.innerWidth / 2;
          const whiteLineWidth = 100;
          const currentPlayerCenterX = prev.playerX + prev.playerSize / 2;
          const isReturningToSameWall =
            currentPlayerCenterX >= centerX - whiteLineWidth / 2 &&
            currentPlayerCenterX <= centerX + whiteLineWidth / 2;

          if (isReturningToSameWall && prev.jumpProgress === 0) {
            // Return to same wall
            newIsOnLeftWall = prev.isOnLeftWall;
          } else {
            // Normal jump to opposite wall
            newIsOnLeftWall = !prev.isOnLeftWall;
          }

          newX = newIsOnLeftWall
            ? prev.wallWidth
            : window.innerWidth - prev.wallWidth - prev.playerSize;
        } else {
          // Calculate position during jump using easing function
          const startX = prev.isOnLeftWall
            ? prev.wallWidth
            : window.innerWidth - prev.wallWidth - prev.playerSize;

          // Check if this is a return jump
          const centerX = window.innerWidth / 2;
          const whiteLineWidth = 100;
          const currentPlayerCenterX = prev.playerX + prev.playerSize / 2;
          const isReturningToSameWall =
            currentPlayerCenterX >= centerX - whiteLineWidth / 2 &&
            currentPlayerCenterX <= centerX + whiteLineWidth / 2 &&
            prev.jumpProgress === 0;

          const endX = isReturningToSameWall
            ? startX // Return to same position
            : prev.isOnLeftWall
              ? window.innerWidth - prev.wallWidth - prev.playerSize
              : prev.wallWidth;

          const jumpCurve = -4 * Math.pow(newJumpProgress - 0.5, 2) + 1; // Parabolic curve for jump

          // Interpolate between start and end positions
          newX = startX + (endX - startX) * newJumpProgress;
        }
      } else {
        // Not jumping, stay on wall
        newX = prev.isOnLeftWall
          ? prev.wallWidth
          : window.innerWidth - prev.wallWidth - prev.playerSize;
      }

      // Update time elapsed
      const newTimeElapsed = prev.timeElapsed + deltaTime;

      // Generate new obstacles
      let newObstacles = [...prev.obstacles];
      // Decrease spawn rate over time (starts at 1.5s, minimum 0.3s)
      const baseSpawnRate = 1.5;
      const minSpawnRate = 0.3;
      const timeSpeedupFactor = 0.1; // How fast the spawn rate increases
      const obstacleSpawnRate = Math.max(
        minSpawnRate,
        baseSpawnRate - newTimeElapsed * timeSpeedupFactor,
      );

      if (newTimeElapsed - prev.lastObstacleTime > obstacleSpawnRate) {
        // Randomly choose which wall to spawn obstacle on
        const spawnOnLeft = Math.random() < 0.5;
        const obstacleWidth = prev.wallWidth; // Match wall width exactly
        const obstacleHeight = 80;

        const newObstacle: Obstacle = {
          x: spawnOnLeft ? 0 : window.innerWidth - prev.wallWidth, // Position obstacles to overlap with wall area
          y: -obstacleHeight, // Start above screen
          width: obstacleWidth,
          height: obstacleHeight,
          isOnLeftWall: spawnOnLeft,
        };

        newObstacles.push(newObstacle);
      }

      // Update obstacle positions
      const obstacleSpeed = 200; // pixels per second
      newObstacles = newObstacles
        .map((obstacle) => ({
          ...obstacle,
          y: obstacle.y + obstacleSpeed * deltaTime,
        }))
        .filter((obstacle) => obstacle.y < window.innerHeight + 100); // Remove obstacles that are off screen

      // Check for collisions
      let isGameOver = prev.isGameOver;

      console.log("=== COLLISION CHECK DEBUG ===");
      console.log("Game over state:", isGameOver);
      console.log("Number of obstacles:", newObstacles.length);
      console.log("Player position:", {
        x: newX,
        y: newY,
        size: prev.playerSize,
      });
      console.log("Player is jumping:", prev.isJumping);
      console.log("Player on left wall:", prev.isOnLeftWall);

      if (!isGameOver) {
        console.log("Checking collisions...");

        for (let i = 0; i < newObstacles.length; i++) {
          const obstacle = newObstacles[i];

          console.log(`--- Obstacle ${i} ---`);
          console.log("Obstacle:", obstacle);

          // Check collision bounds regardless of wall position or jumping state
          const playerLeft = newX;
          const playerRight = newX + prev.playerSize;
          const playerTop = newY;
          const playerBottom = newY + prev.playerSize;

          const obstacleLeft = obstacle.x;
          const obstacleRight = obstacle.x + obstacle.width;
          const obstacleTop = obstacle.y;
          const obstacleBottom = obstacle.y + obstacle.height;

          console.log("Player bounds:", {
            left: playerLeft,
            right: playerRight,
            top: playerTop,
            bottom: playerBottom,
          });

          console.log("Obstacle bounds:", {
            left: obstacleLeft,
            right: obstacleRight,
            top: obstacleTop,
            bottom: obstacleBottom,
          });

          // Log each collision condition (removed tolerance for more accurate detection)
          const condition1 = playerRight > obstacleLeft;
          const condition2 = playerLeft < obstacleRight;
          const condition3 = playerBottom > obstacleTop;
          const condition4 = playerTop < obstacleBottom;

          console.log("Collision conditions:", {
            "playerRight > obstacleLeft": `${playerRight} > ${obstacleLeft} = ${condition1}`,
            "playerLeft < obstacleRight": `${playerLeft} < ${obstacleRight} = ${condition2}`,
            "playerBottom > obstacleTop": `${playerBottom} > ${obstacleTop} = ${condition3}`,
            "playerTop < obstacleBottom": `${playerTop} < ${obstacleBottom} = ${condition4}`,
          });

          const allConditionsMet =
            condition1 && condition2 && condition3 && condition4;
          console.log("All conditions met (collision):", allConditionsMet);

          // Simple AABB collision detection with >= for edge cases
          if (
            playerRight >= obstacleLeft &&
            playerLeft <= obstacleRight &&
            playerBottom >= obstacleTop &&
            playerTop <= obstacleBottom
          ) {
            console.log("🔴 COLLISION DETECTED! Setting game over to true");
            console.log("Final collision data:", {
              player: {
                left: playerLeft,
                right: playerRight,
                top: playerTop,
                bottom: playerBottom,
              },
              obstacle: {
                left: obstacleLeft,
                right: obstacleRight,
                top: obstacleTop,
                bottom: obstacleBottom,
              },
            });
            isGameOver = true;
            break;
          }
        }

        console.log("Final game over state after collision check:", isGameOver);
      } else {
        console.log("Skipping collision check - game already over");
      }

      console.log("=== END COLLISION CHECK DEBUG ===");

      return {
        ...prev,
        playerX: newX,
        playerY: newY,
        isOnLeftWall: newIsOnLeftWall,
        isJumping: newIsJumping,
        jumpProgress: newJumpProgress,
        timeElapsed: newTimeElapsed,
        obstacles: newObstacles,
        lastObstacleTime:
          newTimeElapsed - prev.lastObstacleTime > obstacleSpawnRate
            ? newTimeElapsed
            : prev.lastObstacleTime,
        isGameOver,
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

    // Draw obstacles
    ctx.fillStyle = "#ef4444"; // Red obstacles
    gameState.obstacles.forEach((obstacle) => {
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });

    // Draw white line in the middle
    const centerX = canvas.width / 2;
    const whiteLineWidth = 20; // Much thinner line
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)"; // White with 50% opacity
    ctx.fillRect(
      centerX - whiteLineWidth / 2,
      0,
      whiteLineWidth,
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
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
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
