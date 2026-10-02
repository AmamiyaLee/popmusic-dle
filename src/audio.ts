/* Plays exact slices of a preview through Web Audio.
 *
 * An <audio> element cannot reliably stop after 100 ms, so the whole preview
 * is decoded into an AudioBuffer and slices are scheduled on the audio clock.
 * Apple's preview CDN sends Access-Control-Allow-Origin: *, so no proxy is needed. */

const FETCH_TIMEOUT_MS = 15000;
/** Short fades so a hard cut at 0.1 s does not click. */
const FADE_S = 0.004;
const CACHE_SIZE = 4;

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

export class AudioLoadError extends Error {}

export class ClipPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private volume = 0.8;
  private readonly cache = new Map<string, Promise<AudioBuffer>>();
  private current: { source: AudioBufferSourceNode; frame: number } | null = null;

  private context(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /** Must run synchronously inside a user gesture (iOS). */
  unlock(): void {
    const session = (navigator as AudioSessionNavigator).audioSession;
    if (session) {
      try { session.type = 'playback'; } catch { /* older Safari: ignore */ }
    }
    const ctx = this.context();
    if (ctx.state !== 'running') void ctx.resume();
  }

  load(url: string): Promise<AudioBuffer> {
    const cached = this.cache.get(url);
    if (cached) return cached;
    const pending = this.download(url);
    this.cache.set(url, pending);
    pending.catch(() => this.cache.delete(url));
    while (this.cache.size > CACHE_SIZE) {
      const oldest = this.cache.keys().next().value;
      if (oldest === undefined) break;
      this.cache.delete(oldest);
    }
    return pending;
  }

  private async download(url: string): Promise<AudioBuffer> {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: abort.signal });
      if (!res.ok) throw new AudioLoadError(`試聽檔下載失敗(HTTP ${res.status})`);
      const data = await res.arrayBuffer();
      return await this.context().decodeAudioData(data);
    } catch (e) {
      if (e instanceof AudioLoadError) throw e;
      const reason = abort.signal.aborted ? '連線逾時' : '無法讀取音訊';
      console.warn('[audio] load failed', url, e);
      throw new AudioLoadError(`試聽檔${reason}`);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Plays `seconds` of the buffer from `offset`. Resolves when playback ends
   * or is stopped. `onProgress` receives 0..1.
   */
  play(buffer: AudioBuffer, seconds: number, onProgress?: (p: number) => void, offset = 0): Promise<void> {
    this.stop();
    const ctx = this.context();
    const master = this.master!;
    const length = Math.max(0.01, Math.min(seconds, buffer.duration - offset));

    const gain = ctx.createGain();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain).connect(master);

    const t0 = ctx.currentTime + 0.02;
    const fade = Math.min(FADE_S, length / 4);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(1, t0 + fade);
    gain.gain.setValueAtTime(1, t0 + length - fade);
    gain.gain.linearRampToValueAtTime(0, t0 + length);
    source.start(t0, offset, length);

    return new Promise(resolve => {
      const tick = () => {
        onProgress?.(Math.min(1, Math.max(0, (ctx.currentTime - t0) / length)));
        if (this.current?.source === source) this.current.frame = requestAnimationFrame(tick);
      };
      this.current = { source, frame: requestAnimationFrame(tick) };
      source.onended = () => {
        if (this.current?.source === source) {
          cancelAnimationFrame(this.current.frame);
          this.current = null;
        }
        onProgress?.(1);
        resolve();
      };
    });
  }

  stop(): void {
    if (!this.current) return;
    const { source, frame } = this.current;
    this.current = null;
    cancelAnimationFrame(frame);
    try { source.stop(); } catch { /* already stopped */ }
  }

  get playing(): boolean {
    return this.current !== null;
  }

  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
  }
}
