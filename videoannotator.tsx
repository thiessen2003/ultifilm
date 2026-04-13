import { useState, useRef, useEffect, useCallback } from "react";
import "./VideoAnnotator.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const PLAYER_COLORS = [
  "#3E45DB", "#DB413D",
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Keyframe {
  id: string;
  timestamp_ms: number;
  x_pct: number;
  y_pct: number;
}

interface Player {
  id: string;
  name: string;
  color: string;
  isOffense: boolean;
  keyframes: Keyframe[];
}

interface VideoAnnotatorProps {
  videoSrc?: string;
  onNavigateVisualization?: () => void;
  onNavigateStyles?: () => void;
}

interface PlayerTagProps {
  player: Player;
  isActive: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

interface CanvasOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  players: Player[];
  activePlayerId: string | null;
  currentTimeMs: number;
  onAddKeyframe: (playerId: string, x_pct: number, y_pct: number) => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlayerTag({ player, isActive, onSelect, onRemove }: PlayerTagProps) {
  return (
    <div
      className={`player-tag ${isActive ? "active" : ""}`}
      style={{ "--player-color": player.color } as React.CSSProperties}
      onClick={() => onSelect(player.id)}
    >
      <span className="player-dot" />
      <span className="player-name">{player.name}</span>
      <span className="keyframe-count">{player.keyframes.length} kf</span>
      <button className="remove-btn" onClick={(e) => { e.stopPropagation(); onRemove(player.id); }}>×</button>
    </div>
  );
}

function CanvasOverlay({ videoRef, players, activePlayerId, currentTimeMs, onAddKeyframe }: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Resize canvas to match video
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const resize = () => {
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(video);
    return () => ro.disconnect();
  }, [videoRef]);

  // Draw markers each frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    players.forEach((player) => {
      // Find the closest keyframe to current time
      if (player.keyframes.length === 0) return;
      const sorted = [...player.keyframes].sort((a, b) => a.timestamp_ms - b.timestamp_ms);
      let kf = sorted[0];
      for (const k of sorted) {
        if (k.timestamp_ms <= currentTimeMs) kf = k;
      }
      const x = kf.x_pct * canvas.width;
      const y = kf.y_pct * canvas.height;

      // Draw trail
      ctx.beginPath();
      const trailFrames = sorted.filter(k => k.timestamp_ms <= currentTimeMs).slice(-8);
      trailFrames.forEach((k, i) => {
        const tx = k.x_pct * canvas.width;
        const ty = k.y_pct * canvas.height;
        if (i === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      });
      ctx.strokeStyle = player.color + "66";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw marker
      const isActive = player.id === activePlayerId;
      ctx.beginPath();
      ctx.arc(x, y, isActive ? 14 : 10, 0, Math.PI * 2);
      ctx.fillStyle = player.color + (isActive ? "cc" : "88");
      ctx.fill();
      ctx.strokeStyle = player.color;
      ctx.lineWidth = isActive ? 3 : 2;
      ctx.stroke();

      // Draw label
      ctx.font = `bold ${isActive ? 13 : 11}px 'DM Mono', monospace`;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(player.name.slice(0, 2).toUpperCase(), x, y);
    });
  }, [players, activePlayerId, currentTimeMs]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activePlayerId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x_pct = (e.clientX - rect.left) / rect.width;
    const y_pct = (e.clientY - rect.top) / rect.height;
    onAddKeyframe(activePlayerId, x_pct, y_pct);
  }, [activePlayerId, onAddKeyframe]);

  return (
    <canvas
      ref={canvasRef}
      className="canvas-overlay"
      style={{ cursor: activePlayerId ? "crosshair" : "default" }}
      onClick={handleClick}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VideoAnnotator({ 
  videoSrc = "",
  onNavigateVisualization,
  onNavigateStyles
}: VideoAnnotatorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [videoDurationMs, setVideoDurationMs] = useState(0);
  const [newOffensivePlayerName, setNewOffensivePlayerName] = useState("");
  const [newDefensivePlayerName, setNewDefensivePlayerName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Sync video time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => setCurrentTimeMs(video.currentTime * 1000);
    const onDuration = () => setVideoDurationMs(video.duration * 1000);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onDuration);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onDuration);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  // Save data to localStorage
  useEffect(() => {
    if (videoDurationMs > 0) {
      localStorage.setItem('videoAnnotatorData', JSON.stringify({ players, videoDurationMs }));
    }
  }, [players, videoDurationMs]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const addOffensivePlayer = () => {
    const name = newOffensivePlayerName.trim();
    if (!name) return;
    const newPlayer = {
      id: crypto.randomUUID(),
      name,
      color: PLAYER_COLORS[0],
      isOffense: true,
      keyframes: [],
    };
    setPlayers((p) => [...p, newPlayer]);
    setActivePlayerId(newPlayer.id);
    setNewOffensivePlayerName("");
    showToast(`Offensive player "${name}" added`);
  };

  const addDefensivePlayer = () => {
    const name = newDefensivePlayerName.trim();
    if (!name) return;
    const newPlayer = {
      id: crypto.randomUUID(),
      name,
      color: PLAYER_COLORS[1],
      isOffense: false,
      keyframes: [],
    };
    setPlayers((p) => [...p, newPlayer]);
    setActivePlayerId(newPlayer.id);
    setNewDefensivePlayerName("");
    showToast(`Defensive player "${name}" added`);
  };

  const removePlayer = (id: string) => {
    setPlayers((p) => p.filter((pl) => pl.id !== id));
    if (activePlayerId === id) setActivePlayerId(null);
  };

  const addKeyframe = useCallback((playerId: string, x_pct: number, y_pct: number) => {
    setPlayers((prev) =>
      prev.map((pl) => {
        if (pl.id !== playerId) return pl;
        // Replace keyframe if one exists within 100ms of current time
        const existing = pl.keyframes.findIndex(
          (kf) => Math.abs(kf.timestamp_ms - currentTimeMs) < 100
        );
        const newKf = { id: crypto.randomUUID(), timestamp_ms: currentTimeMs, x_pct, y_pct };
        const keyframes = existing >= 0
          ? pl.keyframes.map((kf, i) => (i === existing ? newKf : kf))
          : [...pl.keyframes, newKf];
        return { ...pl, keyframes };
      })
    );
    showToast(`Keyframe set @ ${(currentTimeMs / 1000).toFixed(2)}s`);
  }, [currentTimeMs]);

  const deleteKeyframe = (playerId: string, kfId: string) => {
    setPlayers((prev) =>
      prev.map((pl) =>
        pl.id !== playerId ? pl : { ...pl, keyframes: pl.keyframes.filter((kf) => kf.id !== kfId) }
      )
    );
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    isPlaying ? v.pause() : v.play();
  };

  const activePlayer = players.find((p) => p.id === activePlayerId);

  // Export tracking data as JSON
  const exportData = () => {
    const data = JSON.stringify({ players, videoDurationMs }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "tracking_data.json"; a.click();
  };

  return (
    <>
      <div className="ultifilm-root">
        <header className="topbar">
          <div className="logo">ULTI<span>FILM</span></div>
          <div className="topbar-actions">
            <button className="export-btn" onClick={exportData}>EXPORT JSON</button>
            {onNavigateVisualization && (
              <button className="nav-btn" onClick={onNavigateVisualization}>
                Visualization
              </button>
            )}
            {onNavigateStyles && (
              <button className="nav-btn" onClick={onNavigateStyles}>
                Styles
              </button>
            )}
          </div>
        </header>

        <div className="main-layout">
          {/* ── Left: Video + Canvas ── */}
          <div className="video-side">
            <div className="video-wrapper">
              {videoSrc ? (
                <>
                  <video
                    ref={videoRef}
                    className="main-video"
                    src={videoSrc}
                    preload="metadata"
                  />
                  <CanvasOverlay
                    videoRef={videoRef}
                    players={players}
                    activePlayerId={activePlayerId}
                    currentTimeMs={currentTimeMs}
                    onAddKeyframe={addKeyframe}
                  />
                </>
              ) : (
                <div className="video-placeholder">
                  ▶ NO VIDEO LOADED
                  <p>Pass a videoSrc prop to get started</p>
                </div>
              )}
            </div>

            <div className="controls-bar">
              <button className="play-btn" onClick={togglePlay}>
                {isPlaying ? "⏸" : "▶"}
              </button>
              <span className="time-display">
                {(currentTimeMs / 1000).toFixed(2)}s / {(videoDurationMs / 1000).toFixed(2)}s
              </span>
              <input
                type="range"
                className="scrubber"
                min={0}
                max={videoDurationMs || 100}
                step={10}
                value={currentTimeMs}
                onChange={(e) => {
                  const t = parseFloat(e.target.value);
                  if (videoRef.current) videoRef.current.currentTime = t / 1000;
                  setCurrentTimeMs(t);
                }}
              />
              {activePlayerId && (
                <span className="active-mode-indicator">
                  ● TRACKING {activePlayer?.name.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* ── Middle: Players Panel ── */}
          <div className="players-panel">
            {/* Add player */}
            <div className="panel-section">
              <span className="panel-label">ADD OFFENSIVE PLAYER</span>
              <div className="add-player-row">
                <input
                  className="player-input"
                  placeholder="Player name or #..."
                  value={newOffensivePlayerName}
                  onChange={(e) => setNewOffensivePlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addOffensivePlayer()}
                />
                <button className="add-btn" onClick={addOffensivePlayer}>ADD</button>
              </div>
            </div>

            {/* Players list */}
            <div className="players-list">
              <span className="panel-label">OFFENSE</span>
              {players.length === 0 && (
                <div className="empty-state">No players yet</div>
              )}
              {players.filter((p) => p.isOffense).map((p) => (
                <PlayerTag
                  key={p.id}
                  player={p}
                  isActive={p.id === activePlayerId}
                  onSelect={setActivePlayerId}
                  onRemove={removePlayer}
                />
              ))}
            </div>

            {/* Keyframes for active player */}
            {activePlayer && activePlayer.isOffense && (
              <div className="kf-list-section">
                <span className="panel-label">KEYFRAMES — {activePlayer.name.toUpperCase()}</span>
                {activePlayer.keyframes.length === 0 && (
                  <div className="empty-state">No keyframes yet</div>
                )}
                {[...activePlayer.keyframes]
                  .sort((a, b) => a.timestamp_ms - b.timestamp_ms)
                  .map((kf) => (
                    <div className="kf-row" key={kf.id}>
                      <span className="kf-time">{(kf.timestamp_ms / 1000).toFixed(2)}s</span>
                      <span className="kf-pos">
                        ({(kf.x_pct * 100).toFixed(0)}%, {(kf.y_pct * 100).toFixed(0)}%)
                      </span>
                      <button className="kf-del" onClick={() => deleteKeyframe(activePlayer.id, kf.id)}>×</button>
                    </div>
                  ))}
              </div>
            )}

            {/* Add defensive player */}
            <div className="panel-section">
              <span className="panel-label">ADD DEFENSIVE PLAYER</span>
              <div className="add-player-row">
                <input
                  className="player-input"
                  placeholder="Player name or #..."
                  value={newDefensivePlayerName}
                  onChange={(e) => setNewDefensivePlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDefensivePlayer()}
                />
                <button className="add-btn" onClick={addDefensivePlayer}>ADD</button>
              </div>
            </div>

            {/* Players list */}
            <div className="players-list">
              <span className="panel-label">DEFENSE</span>
              {players.length === 0 && (
                <div className="empty-state">No players yet</div>
              )}
              {players.filter((p) => !p.isOffense).map((p) => (
                <PlayerTag
                  key={p.id}
                  player={p}
                  isActive={p.id === activePlayerId}
                  onSelect={setActivePlayerId}
                  onRemove={removePlayer}
                />
              ))}
            </div>

            {/* Keyframes for active player */}
            {activePlayer && !activePlayer.isOffense && (
              <div className="kf-list-section">
                <span className="panel-label">KEYFRAMES — {activePlayer.name.toUpperCase()}</span>
                {activePlayer.keyframes.length === 0 && (
                  <div className="empty-state">No keyframes yet</div>
                )}
                {[...activePlayer.keyframes]
                  .sort((a, b) => a.timestamp_ms - b.timestamp_ms)
                  .map((kf) => (
                    <div className="kf-row" key={kf.id}>
                      <span className="kf-time">{(kf.timestamp_ms / 1000).toFixed(2)}s</span>
                      <span className="kf-pos">
                        ({(kf.x_pct * 100).toFixed(0)}%, {(kf.y_pct * 100).toFixed(0)}%)
                      </span>
                      <button className="kf-del" onClick={() => deleteKeyframe(activePlayer.id, kf.id)}>×</button>
                    </div>
                  ))}
              </div>
            )}

          </div>
        </div>

        {toast && <div className="toast">{toast}</div>}
      </div>
    </>
  );
}