import type { Attachment } from '../types';

/** Até este tamanho o conteúdo vai direto no Firestore (rápido, funciona sem Storage). */
/** Limite de cada anexo (fica guardado no Firestore, sem precisar de Storage pago). */
export const INLINE_LIMIT = 700 * 1024;

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function loadBitmap(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* cai para <img> */
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error('Imagem inválida'));
    img.src = url;
  });
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao comprimir imagem'))), 'image/jpeg', quality),
  );
}

/** Reduz a imagem (JPEG) até caber no limite indicado. */
export async function compressImage(
  file: Blob,
  opts: { maxDim?: number; quality?: number; limit?: number; square?: boolean } = {},
): Promise<{ blob: Blob; width: number; height: number }> {
  let maxDim = opts.maxDim ?? 1280;
  let quality = opts.quality ?? 0.78;
  const limit = opts.limit ?? INLINE_LIMIT;
  const bmp = await loadBitmap(file);
  try {
    for (let attempt = 0; attempt < 6; attempt++) {
      let sx = 0;
      let sy = 0;
      let sw = bmp.width;
      let sh = bmp.height;
      if (opts.square) {
        const side = Math.min(bmp.width, bmp.height);
        sx = (bmp.width - side) / 2;
        sy = (bmp.height - side) / 2;
        sw = sh = side;
      }
      const scale = Math.min(1, maxDim / Math.max(sw, sh));
      const w = Math.max(1, Math.round(sw * scale));
      const h = Math.max(1, Math.round(sh * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bmp.source, sx, sy, sw, sh, 0, 0, w, h);
      const blob = await canvasToBlob(canvas, quality);
      if (blob.size <= limit || attempt === 5) return { blob, width: w, height: h };
      quality = Math.max(0.45, quality - 0.1);
      maxDim = Math.round(maxDim * 0.82);
    }
  } finally {
    bmp.close();
  }
  throw new Error('Falha ao comprimir imagem');
}

export function avatarFromFile(file: Blob): Promise<string> {
  return compressImage(file, { maxDim: 256, quality: 0.82, limit: 60 * 1024, square: true }).then((r) => blobToDataUrl(r.blob));
}

export function wishlistImageFromFile(file: Blob): Promise<string> {
  return compressImage(file, { maxDim: 900, quality: 0.74, limit: 140 * 1024 }).then((r) => blobToDataUrl(r.blob));
}

function mediaDuration(file: Blob, kind: 'audio' | 'video'): Promise<number | undefined> {
  return new Promise((resolve) => {
    const el = document.createElement(kind);
    const url = URL.createObjectURL(file);
    const done = (v?: number) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    el.preload = 'metadata';
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? el.duration : undefined);
    el.onerror = () => done(undefined);
    el.src = url;
    setTimeout(() => done(undefined), 4000);
  });
}

export interface PreparedFile {
  attachment: Omit<Attachment, 'mediaId'>;
  blob: Blob;
}

/** Classifica e prepara o ficheiro escolhido (fotos são comprimidas automaticamente). */
export async function prepareFile(file: File): Promise<PreparedFile> {
  const mime = file.type || 'application/octet-stream';
  if (mime.startsWith('image/') && mime !== 'image/svg+xml' && mime !== 'image/gif') {
    const { blob, width, height } = await compressImage(file, { limit: 350 * 1024 });
    return { attachment: { type: 'image', name: file.name.replace(/\.[^.]+$/, '') + '.jpg', size: blob.size, mime: 'image/jpeg', width, height }, blob };
  }
  if (file.size > INLINE_LIMIT) {
    throw new Error(`O ficheiro "${file.name}" tem ${(file.size / 1024 / 1024).toFixed(1)} MB. O máximo é 700 KB (fotos não têm limite: são comprimidas).`);
  }
  if (mime.startsWith('video/')) {
    return { attachment: { type: 'video', name: file.name, size: file.size, mime, duration: await mediaDuration(file, 'video') }, blob: file };
  }
  if (mime.startsWith('audio/')) {
    return { attachment: { type: 'audio', name: file.name, size: file.size, mime, duration: await mediaDuration(file, 'audio') }, blob: file };
  }
  return { attachment: { type: 'file', name: file.name, size: file.size, mime }, blob: file };
}

/* -------------------------------------------------------------------------- */
/* Gravação de notas de voz                                                   */
/* -------------------------------------------------------------------------- */
export interface VoiceResult {
  blob: Blob;
  mime: string;
  duration: number;
  waveform: number[];
}

function pickMime(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  if (typeof MediaRecorder === 'undefined') return '';
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) || '';
}

/** Nota de voz até 2 min (cabe no limite de 700 KB). */
export const VOICE_MAX_SECONDS = 120;

export class VoiceRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private ctx: AudioContext | null = null;
  private analyser: AudioAnalyser | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;
  private levels: number[] = [];
  private mime = '';
  private cancelled = false;

  /** Chamado ~10x/s com o nível de voz (0–1) e os segundos gravados */
  onTick: (level: number, seconds: number) => void = () => {};

  static supported(): boolean {
    return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function" && typeof MediaRecorder !== "undefined");
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    this.mime = pickMime();
    this.recorder = new MediaRecorder(this.stream, {
      ...(this.mime ? { mimeType: this.mime } : {}),
      audioBitsPerSecond: 20000,
    });
    this.chunks = [];
    this.levels = [];
    this.cancelled = false;
    this.recorder.ondataavailable = (e) => e.data.size > 0 && this.chunks.push(e.data);

    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      const src = this.ctx.createMediaStreamSource(this.stream);
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      this.analyser = analyser;
    } catch {
      this.analyser = null;
    }

    this.recorder.start(250);
    this.startedAt = Date.now();
    const buf = new Uint8Array(256);
    this.timer = setInterval(() => {
      let level = 0;
      if (this.analyser) {
        this.analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
        level = Math.min(1, peak / 90);
      } else {
        level = 0.3 + Math.random() * 0.5;
      }
      this.levels.push(level);
      this.onTick(level, (Date.now() - this.startedAt) / 1000);
    }, 100);
  }

  private cleanup() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }

  stop(): Promise<VoiceResult> {
    return new Promise((resolve, reject) => {
      const rec = this.recorder;
      if (!rec) return reject(new Error('Sem gravação ativa'));
      const duration = (Date.now() - this.startedAt) / 1000;
      rec.onstop = () => {
        this.cleanup();
        if (this.cancelled) return reject(new Error('cancelled'));
        const mime = rec.mimeType || this.mime || 'audio/webm';
        const blob = new Blob(this.chunks, { type: mime });
        resolve({ blob, mime, duration, waveform: downsample(this.levels, 44) });
      };
      if (rec.state !== 'inactive') rec.stop();
      else rec.onstop?.(new Event('stop'));
    });
  }

  cancel() {
    this.cancelled = true;
    const rec = this.recorder;
    if (rec && rec.state !== 'inactive') {
      rec.onstop = () => this.cleanup();
      rec.stop();
    } else {
      this.cleanup();
    }
  }
}

type AudioAnalyser = AnalyserNode;

function downsample(levels: number[], bars: number): number[] {
  if (levels.length === 0) return Array(bars).fill(0.2);
  const out: number[] = [];
  const size = levels.length / bars;
  for (let i = 0; i < bars; i++) {
    const from = Math.floor(i * size);
    const to = Math.max(from + 1, Math.floor((i + 1) * size));
    let m = 0;
    for (let j = from; j < to && j < levels.length; j++) m = Math.max(m, levels[j]);
    out.push(Math.max(0.12, Math.round(m * 100) / 100));
  }
  return out;
}
