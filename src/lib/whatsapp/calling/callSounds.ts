/**
 * Lightweight Web-Audio ring / connect / end cues (no external assets).
 * Stops automatically when references are cleared.
 */
export class OutboundCallSoundController {
  private ctx: AudioContext | null = null;

  private ringTimer: ReturnType<typeof setInterval> | null = null;

  private connectNode: OscillatorNode | null = null;

  private ensureCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    return this.ctx;
  }

  async startOutboundRing(): Promise<void> {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => {});
    }
    this.stopRing();
    const beep = () => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 440;
      g.gain.value = 0.08;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.12);
    };
    beep();
    this.ringTimer = setInterval(beep, 1600);
  }

  stopRing(): void {
    if (this.ringTimer) {
      clearInterval(this.ringTimer);
      this.ringTimer = null;
    }
  }

  async playConnectChime(): Promise<void> {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(523.25, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.08);
    g.gain.value = 0.07;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.18);
  }

  async playEndChime(): Promise<void> {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(392, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(196, ctx.currentTime + 0.2);
    g.gain.value = 0.06;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.22);
  }

  dispose(): void {
    this.stopRing();
    if (this.connectNode) {
      try {
        this.connectNode.stop();
      } catch {
        /* ignore */
      }
      this.connectNode = null;
    }
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}

/**
 * Louder repeating ring for **incoming** customer calls (banner / notification).
 * Stopped when user answers, declines, or call clears.
 */
export class IncomingCallRingController {
  private ctx: AudioContext | null = null;

  private interval: ReturnType<typeof setInterval> | null = null;

  private ensureCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    return this.ctx;
  }

  private playDoubleRing(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const ring = (freq: number, t0: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.value = 0.14;
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.22);
    };
    const t = ctx.currentTime;
    ring(440, t);
    ring(523.25, t + 0.28);
  }

  async start(): Promise<void> {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => {});
    }
    this.stop();
    this.playDoubleRing();
    this.interval = setInterval(() => this.playDoubleRing(), 2800);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  dispose(): void {
    this.stop();
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}
