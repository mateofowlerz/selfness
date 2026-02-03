export type Track = {
  src: string;
  title: string;
  album: string;
  cover: string;
};

type AudioState = {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
};

let globalAudio: HTMLAudioElement | null = null;
const state: AudioState = {
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
};

const listeners = new Set<() => void>();

function notifyListeners() {
  for (const fn of listeners) {
    fn();
  }
}

function getAudio(): HTMLAudioElement {
  if (!globalAudio && typeof window !== "undefined") {
    globalAudio = new Audio();
    globalAudio.addEventListener("timeupdate", () => {
      state.progress = globalAudio?.currentTime;
      state.duration = globalAudio?.duration || 0;
      notifyListeners();
    });
    globalAudio.addEventListener("ended", () => {
      state.isPlaying = false;
      notifyListeners();
    });
    globalAudio.addEventListener("pause", () => {
      state.isPlaying = false;
      notifyListeners();
    });
    globalAudio.addEventListener("play", () => {
      state.isPlaying = true;
      notifyListeners();
    });
  }
  return globalAudio as HTMLAudioElement;
}

export function play(track: Track) {
  const audio = getAudio();
  if (state.currentTrack?.src !== track.src) {
    audio.src = track.src;
    state.currentTrack = track;
    state.progress = 0;
  }
  audio.play();
}

export function pause() {
  globalAudio?.pause();
}

export function togglePlay(track: Track) {
  if (state.isPlaying && state.currentTrack?.src === track.src) {
    pause();
  } else {
    play(track);
  }
}

export function seek(time: number) {
  if (globalAudio) {
    globalAudio.currentTime = time;
  }
}

export function getState(): AudioState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isTrackPlaying(src: string): boolean {
  return state.isPlaying && state.currentTrack?.src === src;
}
