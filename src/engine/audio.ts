/**
 * Sonido chiptune generado en tiempo real con Web Audio (sin archivos de audio).
 * Todas las melodías son originales de este juego.
 *
 * Los navegadores exigen un gesto del usuario antes de sonar: `unlock()` se llama
 * con la primera tecla o toque, y si ya se había pedido una canción, arranca ahí.
 */

export type SfxName =
  | 'jump'
  | 'jumpBig'
  | 'heart'
  | 'bump'
  | 'break'
  | 'sprout'
  | 'powerup'
  | 'stomp'
  | 'kick'
  | 'shrink'
  | 'oneUp'
  | 'flagpole'
  | 'tick'
  | 'pause';

export type SongName = 'overworld' | 'underground' | 'hurry' | 'clear' | 'death' | 'gameover' | 'ending' | 'crawl';

type Wave = OscillatorType | 'drum';

interface Voice {
  wave: Wave;
  vol: number;
  /** Un token por paso: nota ("C5", "F#4"), "-" sostiene la anterior, "." silencio. Batería: k, s, h. */
  notes: string;
}

interface Song {
  /** Duración de un paso (semicorchea) en segundos. */
  step: number;
  loop: boolean;
  voices: Voice[];
}

// ---------- Canciones (originales) ----------

const SONGS: Record<SongName, Song> = {
  // Alegre, en Do mayor
  overworld: {
    step: 0.11,
    loop: true,
    voices: [
      {
        wave: 'square',
        vol: 0.06,
        notes:
          'C5 . E5 . G5 . E5 . A5 - G5 . E5 . D5 . ' +
          'E5 . G5 . C6 . B5 . A5 - G5 . . . . . ' +
          'F5 . A5 . C6 . A5 . G5 - E5 . C5 . D5 . ' +
          'E5 . D5 . C5 . D5 . C5 - - - . . . . ',
      },
      {
        wave: 'triangle',
        vol: 0.16,
        notes:
          'C3 . G3 . C3 . G3 . A2 . E3 . A2 . E3 . ' +
          'F2 . C3 . F2 . C3 . G2 . D3 . G2 . D3 . ' +
          'F2 . C3 . F2 . C3 . C3 . G3 . C3 . G3 . ' +
          'G2 . D3 . G2 . D3 . C3 . G2 . C3 . . . ',
      },
      { wave: 'drum', vol: 0.12, notes: 'k . h . s . h . k . h . s . h h '.repeat(4) },
    ],
  },
  // Misteriosa, en La menor
  underground: {
    step: 0.13,
    loop: true,
    voices: [
      {
        wave: 'square',
        vol: 0.05,
        notes:
          'A4 . . C5 . . E5 . D5 . C5 . B4 . . . ' +
          'G4 . . B4 . . D5 . C5 . B4 . A4 . . . ' +
          'A4 . . C5 . . E5 . F5 . E5 . D5 . . . ' +
          'E5 . D5 . C5 . B4 . A4 - - - . . . . ',
      },
      {
        wave: 'triangle',
        vol: 0.18,
        notes:
          'A2 . . . A2 . . . F2 . . . F2 . . . ' +
          'G2 . . . G2 . . . E2 . . . E2 . . . ' +
          'A2 . . . A2 . . . D2 . . . D2 . . . ' +
          'E2 . . . E2 . . . A2 . . . A2 . . . ',
      },
      { wave: 'drum', vol: 0.08, notes: 'k . . . h . . . s . . . h . . . '.repeat(4) },
    ],
  },
  // Aviso de poco tiempo
  hurry: {
    step: 0.07,
    loop: false,
    voices: [{ wave: 'square', vol: 0.07, notes: 'C6 C#6 D6 . C6 C#6 D6 . C6 C#6 D6 . D6 - - . ' }],
  },
  clear: {
    step: 0.09,
    loop: false,
    voices: [
      { wave: 'square', vol: 0.07, notes: 'C5 E5 G5 C6 - - G5 C6 - - E6 - - - - - . . ' },
      { wave: 'triangle', vol: 0.16, notes: 'C3 . G3 . . . E3 . . . C3 - - - - - . . ' },
    ],
  },
  death: {
    step: 0.13,
    loop: false,
    voices: [
      { wave: 'square', vol: 0.07, notes: 'E5 . D#5 . D5 . C#5 . C5 - - - . G4 C4 - - - ' },
      { wave: 'triangle', vol: 0.14, notes: 'C3 . . . B2 . . . A#2 - - - . G2 C2 - - - ' },
    ],
  },
  gameover: {
    step: 0.16,
    loop: false,
    voices: [
      { wave: 'square', vol: 0.06, notes: 'G4 . E4 . C4 - - . D4 E4 C4 - - - - - ' },
      { wave: 'triangle', vol: 0.15, notes: 'C3 . . . G2 - - . F2 G2 C2 - - - - - ' },
    ],
  },
  // Marcha épica del intro (la historia que sube por la pantalla), en La menor
  crawl: {
    step: 0.14,
    loop: true,
    voices: [
      {
        wave: 'square',
        vol: 0.055,
        notes:
          'A4 - - . A4 - - . A4 - C5 - E5 - - - D5 - C5 - B4 - - - A4 - - - - - . . ' +
          'F4 - - . F4 - - . F4 - A4 - C5 - - - B4 - A4 - G#4 - - - E4 - - - - - . . ' +
          'A4 - - . A4 - - . C5 - E5 - A5 - - - G5 - F5 - E5 - - - D5 - C5 - B4 - - - ' +
          'C5 - E5 - D5 - B4 - A4 - - - - - - - E4 - - - A3 - - - - - - - . . . . ',
      },
      {
        wave: 'square',
        vol: 0.03,
        notes:
          'E4 - - . E4 - - . E4 - A4 - C5 - - - B4 - A4 - G#4 - - - E4 - - - - - . . ' +
          'C4 - - . C4 - - . C4 - F4 - A4 - - - G#4 - F4 - E4 - - - C4 - - - - - . . ' +
          'E4 - - . E4 - - . A4 - C5 - E5 - - - E5 - D5 - C5 - - - B4 - A4 - G#4 - - - ' +
          'A4 - C5 - B4 - G#4 - E4 - - - - - - - C4 - - - E3 - - - - - - - . . . . ',
      },
      {
        wave: 'triangle',
        vol: 0.17,
        notes:
          'A2 . A2 . A2 . A2 . A2 . A2 . A2 . A2 . '.repeat(2) +
          'F2 . F2 . F2 . F2 . F2 . F2 . F2 . F2 . E2 . E2 . E2 . E2 . E2 . E2 . E2 . E2 . ' +
          'A2 . A2 . A2 . A2 . A2 . A2 . A2 . A2 . F2 . F2 . F2 . F2 . G2 . G2 . G2 . G2 . ' +
          'A2 . E2 . A2 . E2 . A2 . E2 . A2 . E2 . A2 - - - - - - - A2 - - - . . . . ',
      },
      { wave: 'drum', vol: 0.11, notes: 'k . . . s . . . k . k . s . . . '.repeat(8) },
    ],
  },
  // Tema romántico del rescate de Yazmín
  ending: {
    step: 0.15,
    loop: true,
    voices: [
      {
        wave: 'square',
        vol: 0.05,
        notes:
          'E5 - G5 - C6 - - - B5 - A5 - G5 - - - ' +
          'F5 - A5 - D6 - - - C6 - B5 - C6 - - - ' +
          'A5 - G5 - E5 - - - F5 - E5 - D5 - - - ' +
          'E5 - G5 - B5 - - - C6 - - - - - - - ',
      },
      {
        wave: 'triangle',
        vol: 0.15,
        notes:
          'C3 . G3 . E3 . G3 . F2 . C3 . A2 . C3 . ' +
          'D3 . A3 . F3 . A3 . G2 . D3 . C3 . G3 . ' +
          'A2 . E3 . C3 . E3 . F2 . C3 . G2 . D3 . ' +
          'C3 . G3 . E3 . G3 . C3 . G3 . C3 . . . ',
      },
    ],
  },
};

// ---------- Utilidades ----------

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteFreq(note: string): number {
  const m = /^([A-G])(#?)(\d)$/.exec(note);
  if (!m) throw new Error(`Nota inválida: ${note}`);
  const midi = (Number(m[3]) + 1) * 12 + NOTE_INDEX[m[1]!]! + (m[2] ? 1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

function loadMuted(): boolean {
  try {
    return localStorage.getItem('jy-muted') === '1';
  } catch {
    return false;
  }
}

interface Playing {
  name: SongName;
  song: Song;
  voices: string[][];
  length: number;
  pos: number;
  nextTime: number;
  onEnd?: () => void;
}

class Sound {
  muted = loadMuted();
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private current: Playing | null = null;
  /** Canción pedida antes de que el audio estuviera desbloqueado. */
  private pending: { name: SongName; onEnd?: () => void } | null = null;
  private tempo = 1;
  private paused = false;

  /** Crea o reanuda el AudioContext. Llamar desde un gesto del usuario. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(ctx.destination);
      this.musicBus = ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus = ctx.createGain();
      this.sfxBus.connect(this.master);
      this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      window.setInterval(() => this.schedule(), 25);
    }
    void this.ctx.resume();
    if (this.pending) {
      const { name, onEnd } = this.pending;
      this.pending = null;
      this.music(name, onEnd);
    }
  }

  toggleMute(): void {
    this.muted = !this.muted;
    if (this.ctx) this.master.gain.value = this.muted ? 0 : 1;
    try {
      localStorage.setItem('jy-muted', this.muted ? '1' : '0');
    } catch {
      /* sin almacenamiento: ignorar */
    }
  }

  // ---------- Música ----------

  /** Empieza una canción (o ninguna con null). `onEnd` se llama al terminar una que no se repite. */
  music(name: SongName | null, onEnd?: () => void): void {
    this.current = null;
    this.tempo = 1;
    this.paused = false;
    if (!name) {
      this.pending = null;
      return;
    }
    if (!this.ctx) {
      this.pending = { name, onEnd };
      return;
    }
    const song = SONGS[name];
    const voices = song.voices.map((v) => v.notes.trim().split(/\s+/));
    this.current = {
      name,
      song,
      voices,
      length: Math.max(...voices.map((v) => v.length)),
      pos: 0,
      nextTime: this.ctx.currentTime + 0.05,
      onEnd,
    };
  }

  get playing(): SongName | null {
    return this.current?.name ?? this.pending?.name ?? null;
  }

  /** Acelera la música (poco tiempo). */
  setTempo(t: number): void {
    this.tempo = t;
  }

  setPaused(paused: boolean): void {
    if (!this.ctx || this.paused === paused) return;
    this.paused = paused;
    this.musicBus.gain.setTargetAtTime(paused ? 0 : 1, this.ctx.currentTime, 0.01);
    if (!paused && this.current) this.current.nextTime = this.ctx.currentTime + 0.05;
  }

  private schedule(): void {
    const ctx = this.ctx;
    const cur = this.current;
    if (!ctx || !cur || this.paused) return;
    const stepDur = cur.song.step / this.tempo;
    while (cur.nextTime < ctx.currentTime + 0.12) {
      if (cur.pos >= cur.length) {
        if (cur.song.loop) {
          cur.pos = 0;
        } else {
          this.current = null;
          const end = cur.onEnd;
          if (end) window.setTimeout(end, Math.max(0, (cur.nextTime - ctx.currentTime) * 1000));
          return;
        }
      }
      cur.song.voices.forEach((voice, vi) => {
        const tokens = cur.voices[vi]!;
        const tok = tokens[cur.pos % tokens.length];
        if (!tok || tok === '.' || tok === '-') return;
        if (voice.wave === 'drum') {
          this.drum(tok, cur.nextTime, voice.vol);
          return;
        }
        // Duración: este paso más los "-" que le siguen
        let len = 1;
        while (tokens[cur.pos + len] === '-') len++;
        this.tone(noteFreq(tok), cur.nextTime, len * stepDur * 0.95, voice.wave, voice.vol, this.musicBus);
      });
      cur.pos++;
      cur.nextTime += stepDur;
    }
  }

  // ---------- Síntesis ----------

  private tone(freq: number, t: number, dur: number, wave: OscillatorType, vol: number, bus: GainNode, slideTo?: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.setValueAtTime(vol, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(t: number, dur: number, vol: number, bus: GainNode, highpass = 800): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = highpass;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private drum(kind: string, t: number, vol: number): void {
    if (kind === 'k') this.tone(150, t, 0.1, 'sine', vol * 2.5, this.musicBus, 45);
    else if (kind === 's') this.noise(t, 0.09, vol, this.musicBus, 1500);
    else if (kind === 'h') this.noise(t, 0.03, vol * 0.6, this.musicBus, 6000);
  }

  /** Secuencia rápida de notas para efectos. */
  private arp(notes: string[], t: number, step: number, wave: OscillatorType, vol: number, last = step): void {
    notes.forEach((n, i) => {
      const dur = i === notes.length - 1 ? last : step;
      this.tone(noteFreq(n), t + i * step, dur, wave, vol, this.sfxBus);
    });
  }

  // ---------- Efectos ----------

  sfx(name: SfxName): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + 0.005;
    const bus = this.sfxBus;
    switch (name) {
      case 'jump':
        this.tone(300, t, 0.16, 'square', 0.07, bus, 720);
        break;
      case 'jumpBig':
        this.tone(220, t, 0.18, 'square', 0.07, bus, 560);
        break;
      case 'heart':
        this.arp(['A5', 'D6', 'A6'], t, 0.05, 'square', 0.06, 0.18);
        break;
      case 'bump':
        this.tone(140, t, 0.08, 'square', 0.09, bus, 90);
        break;
      case 'break':
        this.noise(t, 0.22, 0.25, bus, 300);
        this.tone(110, t, 0.12, 'square', 0.08, bus, 60);
        break;
      case 'sprout':
        this.arp(['C5', 'G5', 'C6', 'D5', 'A5', 'D6', 'E5', 'B5', 'E6'], t, 0.035, 'triangle', 0.14);
        break;
      case 'powerup':
        this.arp(['C5', 'E5', 'G5', 'C6', 'E5', 'G5', 'C6', 'E6', 'G5', 'C6', 'E6', 'G6'], t, 0.04, 'square', 0.06);
        break;
      case 'stomp':
        this.tone(520, t, 0.1, 'square', 0.08, bus, 180);
        this.noise(t, 0.05, 0.12, bus, 1200);
        break;
      case 'kick':
        this.tone(760, t, 0.06, 'square', 0.07, bus, 380);
        this.noise(t, 0.04, 0.12, bus, 2000);
        break;
      case 'shrink':
        this.arp(['G5', 'D5', 'G4', 'D4', 'G3'], t, 0.06, 'square', 0.07);
        break;
      case 'oneUp':
        this.arp(['G5', 'C6', 'E6', 'G6', 'C7'], t, 0.07, 'square', 0.06, 0.3);
        break;
      case 'flagpole':
        this.tone(1100, t, 1.0, 'square', 0.05, bus, 180);
        break;
      case 'tick':
        this.tone(1320, t, 0.025, 'square', 0.04, bus);
        break;
      case 'pause':
        this.arp(['E6', 'C6', 'E6', 'C6'], t, 0.07, 'square', 0.05);
        break;
    }
  }
}

/** Instancia única del sonido del juego. */
export const sound = new Sound();
