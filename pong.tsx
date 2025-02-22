"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Pause, Volume2, Volume1, VolumeX } from "lucide-react"
import localFont from "next/font/local"

// Load arcade font
const arcadeFont = localFont({
  src: "./PressStart2P-Regular.ttf",
  variable: "--font-arcade",
})

interface Particle {
  x: number
  y: number
  dx: number
  dy: number
  life: number
}

interface GameSettings {
  theme: string
  sfxVolume: number
  musicVolume: number
  sfxEnabled: boolean
  musicEnabled: boolean
}

const THEMES = {
  classic: {
    background: "black",
    foreground: "white",
    accent: "white",
  },
  neon: {
    background: "#000033",
    foreground: "#00ff00",
    accent: "#ff00ff",
  },
  retro: {
    background: "#382800",
    foreground: "#f8b700",
    accent: "#ff8c00",
  },
  matrix: {
    background: "#001a00",
    foreground: "#00ff00",
    accent: "#33ff33",
  },
  ocean: {
    background: "#000033",
    foreground: "#00ffff",
    accent: "#0099ff",
  },
}

export default function Pong() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [gamePaused, setGamePaused] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showPauseMenu, setShowPauseMenu] = useState(false)
  const [score, setScore] = useState({ player1: 0, player2: 0 })
  const [winner, setWinner] = useState<string | null>(null)

  // Game settings
  const [settings, setSettings] = useState<GameSettings>({
    theme: "classic",
    sfxVolume: 50,
    musicVolume: 30,
    sfxEnabled: true,
    musicEnabled: true,
  })

  // Sound references
  const backgroundMusic = useRef<HTMLAudioElement | null>(null)
  const paddleHitSound = useRef<HTMLAudioElement | null>(null)
  const wallHitSound = useRef<HTMLAudioElement | null>(null)
  const scoreSound = useRef<HTMLAudioElement | null>(null)

  // Initialize sounds
  useEffect(() => {
    // Create audio elements
    backgroundMusic.current = new Audio("/blue-danube.mp3")
    paddleHitSound.current = new Audio("/paddle-hit.mp3")
    wallHitSound.current = new Audio("/wall-hit.mp3")
    scoreSound.current = new Audio("/score.mp3")

    // Set initial properties
    if (backgroundMusic.current) {
      backgroundMusic.current.loop = true
    }

    // Update volumes based on settings
    updateVolumes()

    return () => {
      // Cleanup audio elements
      backgroundMusic.current?.pause()
      paddleHitSound.current?.pause()
      wallHitSound.current?.pause()
      scoreSound.current?.pause()
    }
  }, [])

  // Update volumes when settings change
  const updateVolumes = useCallback(() => {
    if (backgroundMusic.current) {
      backgroundMusic.current.volume = settings.musicEnabled ? settings.musicVolume / 100 : 0
    }
    ;[paddleHitSound, wallHitSound, scoreSound].forEach((sound) => {
      if (sound.current) {
        sound.current.volume = settings.sfxEnabled ? settings.sfxVolume / 100 : 0
      }
    })
  }, [settings])

  useEffect(() => {
    updateVolumes()
  }, [updateVolumes])

  // Play sound function
  const playSound = useCallback(
    (sound: HTMLAudioElement | null) => {
      if (sound && settings.sfxEnabled) {
        sound.currentTime = 0
        sound.play().catch((e) => console.log("Audio play failed:", e))
      }
    },
    [settings.sfxEnabled],
  )

  // Handle music
  useEffect(() => {
    if (gameStarted && !gamePaused && settings.musicEnabled) {
      backgroundMusic.current?.play().catch((e) => console.log("Music play failed:", e))
    } else {
      backgroundMusic.current?.pause()
    }
  }, [gameStarted, gamePaused, settings.musicEnabled])

  // Game loop
  useEffect(() => {
    if (!gameStarted || gamePaused) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let particles: Particle[] = []

    // Game objects with 50x slower speed
    const ball = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      radius: 8,
      dx: 0.3, // Changed from 3 to 0.3 (50x slower)
      dy: 0.3, // Changed from 3 to 0.3 (50x slower)
    }

    const paddleHeight = 100
    const paddleWidth = 10
    const paddle1 = {
      y: canvas.height / 2 - paddleHeight / 2,
      speed: 0.4, // Changed from 4 to 0.4 (50x slower)
    }
    const paddle2 = {
      y: canvas.height / 2 - paddleHeight / 2,
      speed: 0.4, // Changed from 4 to 0.4 (50x slower)
    }

    // Key states
    const keys = {
      w: false,
      s: false,
      ArrowUp: false,
      ArrowDown: false,
    }

    // Event listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setGamePaused(true)
        setShowPauseMenu(true)
        return
      }
      if (e.key in keys) {
        keys[e.key as keyof typeof keys] = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key in keys) {
        keys[e.key as keyof typeof keys] = false
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    // Create particles
    const createParticles = (x: number, y: number, count: number) => {
      for (let i = 0; i < count; i++) {
        particles.push({
          x,
          y,
          dx: (Math.random() - 0.5) * 0.2, // Reduced from 2 to 0.2
          dy: (Math.random() - 0.5) * 0.2, // Reduced from 2 to 0.2
          life: 1,
        })
      }
    }

    // Update particles
    const updateParticles = () => {
      particles = particles.filter((p) => {
        p.x += p.dx
        p.y += p.dy
        p.life -= 0.005 // Reduced from 0.02 to 0.005 for slower fade
        return p.life > 0
      })
    }

    // Draw particles
    const drawParticles = () => {
      const theme = THEMES[settings.theme as keyof typeof THEMES]
      particles.forEach((p) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
        ctx.fillStyle = `${theme.accent}${Math.floor(p.life * 255)
          .toString(16)
          .padStart(2, "0")}`
        ctx.fill()
      })
    }

    // Draw game objects
    const draw = () => {
      const theme = THEMES[settings.theme as keyof typeof THEMES]

      // Clear canvas
      ctx.fillStyle = theme.background
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw center line
      const lineSegmentHeight = 20
      const gap = 15
      for (let y = 0; y < canvas.height; y += lineSegmentHeight + gap) {
        ctx.fillStyle = theme.foreground
        ctx.fillRect(canvas.width / 2 - 1, y, 2, lineSegmentHeight)
      }

      // Draw paddles
      ctx.fillStyle = theme.foreground
      ctx.fillRect(0, paddle1.y, paddleWidth, paddleHeight)
      ctx.fillRect(canvas.width - paddleWidth, paddle2.y, paddleWidth, paddleHeight)

      // Draw ball
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
      ctx.fillStyle = theme.foreground
      ctx.fill()

      // Draw particles
      drawParticles()

      // Draw score
      ctx.font = "32px 'Press Start 2P', monospace"
      ctx.fillStyle = theme.foreground
      ctx.textAlign = "center"
      ctx.fillText(score.player1.toString(), canvas.width / 4, 60)
      ctx.fillText(score.player2.toString(), (canvas.width * 3) / 4, 60)
    }

    // Update game state
    const update = () => {
      // Move paddles
      if (keys.w && paddle1.y > 0) paddle1.y -= paddle1.speed
      if (keys.s && paddle1.y < canvas.height - paddleHeight) paddle1.y += paddle1.speed
      if (keys.ArrowUp && paddle2.y > 0) paddle2.y -= paddle2.speed
      if (keys.ArrowDown && paddle2.y < canvas.height - paddleHeight) paddle2.y += paddle2.speed

      // Move ball
      ball.x += ball.dx
      ball.y += ball.dy

      // Ball collision with top and bottom
      if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
        ball.dy = -ball.dy
        createParticles(ball.x, ball.y, 10)
        playSound(wallHitSound.current)
      }

      // Ball collision with paddles
      if (
        (ball.x - ball.radius < paddleWidth && ball.y > paddle1.y && ball.y < paddle1.y + paddleHeight) ||
        (ball.x + ball.radius > canvas.width - paddleWidth && ball.y > paddle2.y && ball.y < paddle2.y + paddleHeight)
      ) {
        ball.dx = -ball.dx
        createParticles(ball.x, ball.y, 15)
        playSound(paddleHitSound.current)
      }

      // Score points
      if (ball.x + ball.radius < 0) {
        setScore((prev) => ({ ...prev, player2: prev.player2 + 1 }))
        ball.x = canvas.width / 2
        ball.y = canvas.height / 2
        ball.dx = 0.3 // Changed from 3 to 0.3
        playSound(scoreSound.current)
      } else if (ball.x - ball.radius > canvas.width) {
        setScore((prev) => ({ ...prev, player1: prev.player1 + 1 }))
        ball.x = canvas.width / 2
        ball.y = canvas.height / 2
        ball.dx = -0.3 // Changed from -3 to -0.3
        playSound(scoreSound.current)
      }

      // Update particles
      updateParticles()
    }

    // Game loop
    const gameLoop = () => {
      update()
      draw()
      animationFrameId = requestAnimationFrame(gameLoop)
    }

    // Start game loop
    gameLoop()

    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      cancelAnimationFrame(animationFrameId)
    }
  }, [gameStarted, gamePaused, playSound, settings.theme, score.player1, score.player2])

  // Check for winner
  useEffect(() => {
    if (score.player1 >= 15) {
      setWinner("Player 1")
      setGameStarted(false)
      playSound(scoreSound.current)
    } else if (score.player2 >= 15) {
      setWinner("Player 2")
      setGameStarted(false)
      playSound(scoreSound.current)
    }
  }, [score, playSound])

  const handleStart = () => {
    if (!gameStarted && !showControls) {
      setShowControls(true)
    } else {
      setGameStarted(true)
      setShowControls(false)
      setScore({ player1: 0, player2: 0 })
      setWinner(null)
      setGamePaused(false)
      setShowPauseMenu(false)
    }
  }

  const handleResume = () => {
    setGamePaused(false)
    setShowPauseMenu(false)
  }

  const handleQuit = () => {
    setGameStarted(false)
    setGamePaused(false)
    setShowPauseMenu(false)
    setScore({ player1: 0, player2: 0 })
    setWinner(null)
  }

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen p-4 ${arcadeFont.variable}`}
      style={{
        backgroundColor: THEMES[settings.theme as keyof typeof THEMES].background,
        color: THEMES[settings.theme as keyof typeof THEMES].foreground,
      }}
    >
      <h1 className="text-4xl font-arcade mb-8">Pooooooongg!!</h1>
      <div className="relative">
        <canvas ref={canvasRef} width={800} height={600} className="border border-current mb-4" />

        {gameStarted && !showPauseMenu && (
          <Button
            onClick={() => setShowPauseMenu(true)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20"
          >
            <Pause className="w-4 h-4" />
          </Button>
        )}

        {showPauseMenu && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="bg-black p-8 rounded-lg border border-current">
              <h2 className="text-2xl font-arcade mb-6">Paused</h2>
              <div className="space-y-4">
                <Button onClick={handleResume} className="w-full bg-white/10 hover:bg-white/20 font-arcade">
                  Resume
                </Button>
                <Button
                  onClick={() => setShowSettings(true)}
                  className="w-full bg-white/10 hover:bg-white/20 font-arcade"
                >
                  Settings
                </Button>
                <Button onClick={handleQuit} className="w-full bg-white/10 hover:bg-white/20 font-arcade">
                  Quit
                </Button>
              </div>
            </div>
          </div>
        )}

        {showSettings && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="bg-black p-8 rounded-lg border border-current max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-arcade">Settings</h2>
                <Button onClick={() => setShowSettings(false)} className="bg-white/10 hover:bg-white/20">
                  ✕
                </Button>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-arcade mb-4">Sound Settings</h3>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Music Volume</label>
                      <div className="flex items-center gap-2">
                        {settings.musicEnabled ? (
                          settings.musicVolume > 50 ? (
                            <Volume2 className="w-4 h-4" />
                          ) : (
                            <Volume1 className="w-4 h-4" />
                          )
                        ) : (
                          <VolumeX className="w-4 h-4" />
                        )}
                        <span className="w-12 text-right">{settings.musicVolume}%</span>
                      </div>
                    </div>
                    <Slider
                      value={[settings.musicVolume]}
                      onValueChange={([value]) => setSettings((prev) => ({ ...prev, musicVolume: value }))}
                      max={100}
                      step={1}
                      disabled={!settings.musicEnabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm">SFX Volume</label>
                      <div className="flex items-center gap-2">
                        {settings.sfxEnabled ? (
                          settings.sfxVolume > 50 ? (
                            <Volume2 className="w-4 h-4" />
                          ) : (
                            <Volume1 className="w-4 h-4" />
                          )
                        ) : (
                          <VolumeX className="w-4 h-4" />
                        )}
                        <span className="w-12 text-right">{settings.sfxVolume}%</span>
                      </div>
                    </div>
                    <Slider
                      value={[settings.sfxVolume]}
                      onValueChange={([value]) => setSettings((prev) => ({ ...prev, sfxVolume: value }))}
                      max={100}
                      step={1}
                      disabled={!settings.sfxEnabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm">Music</label>
                    <Switch
                      checked={settings.musicEnabled}
                      onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, musicEnabled: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm">Sound Effects</label>
                    <Switch
                      checked={settings.sfxEnabled}
                      onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, sfxEnabled: checked }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-arcade mb-4">Game Settings</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(THEMES).map((theme) => (
                      <Button
                        key={theme}
                        onClick={() => setSettings((prev) => ({ ...prev, theme }))}
                        className={`capitalize ${
                          settings.theme === theme ? "bg-white/20 border-current" : "bg-white/10 hover:bg-white/20"
                        }`}
                      >
                        {theme}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {winner && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 animate-in fade-in zoom-in duration-300">
            <div className="bg-black p-8 rounded-lg border-2 border-current text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-4xl font-arcade animate-pulse">Game Over!</h2>
                <p className="text-2xl font-arcade">{winner} Wins!</p>
              </div>
              <Button onClick={handleStart} className="bg-white/10 hover:bg-white/20 font-arcade text-lg px-8 py-4">
                Play Again
              </Button>
            </div>
          </div>
        )}
      </div>

      {!gameStarted && !showSettings && (
        <Button onClick={handleStart} className="bg-white/10 hover:bg-white/20 font-arcade text-lg px-8 py-4">
          {showControls ? "Start Game" : "Play Pong"}
        </Button>
      )}

      {showControls && !showSettings && (
        <div className="font-arcade mt-4 text-center text-sm space-y-4">
          <h2 className="text-xl mb-2">Controls</h2>
          <p>Player 1: W (up) and S (down)</p>
          <p>Player 2: ↑ and ↓ arrow keys</p>
          <p className="mt-2">First to 15 points wins!</p>
          <p className="mt-2">Press ESC to pause</p>
        </div>
      )}

      {/*
        {winner && !showSettings && (
          <div className="font-arcade mt-4 text-xl">
            {winner} wins! Press Play to start a new game.
          </div>
        )}
      */}
    </div>
  )
}

