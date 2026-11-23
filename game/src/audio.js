// Sunset Keys — synthesized sound. One job: every sound the game makes,
// built from oscillators and filtered noise at run time. No audio files,
// no network, and nothing breaks if the browser has no audio yet.
export function createAudio() {
  let context = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain).connect(context.destination);
      engineOsc.start();
      sirenOsc = context.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = context.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain).connect(context.destination);
      sirenOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, seconds, type, volume) {
    if (!ensure()) return;
    try {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume || 0.12, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + seconds);
      osc.connect(gain).connect(context.destination);
      osc.start();
      osc.stop(context.currentTime + seconds);
    } catch { /* sound is decoration, never a crash */ }
  }

  function noiseBurst(seconds, volume) {
    if (!ensure()) return;
    try {
      const length = Math.floor(context.sampleRate * seconds);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = context.createBufferSource();
      source.buffer = buffer;
      const gain = context.createGain();
      gain.gain.value = volume || 0.2;
      source.connect(gain).connect(context.destination);
      source.start();
    } catch { /* sound is decoration, never a crash */ }
  }

  return {
    // Call once from the first user gesture; harmless when it fails.
    unlock() { ensure(); if (context && context.state === 'suspended') context.resume().catch(() => {}); },
    engine(speed01, on) {
      if (!context || !engineGain) return;
      try {
        engineGain.gain.value = on ? 0.03 + speed01 * 0.05 : 0;
        engineOsc.frequency.value = 55 + speed01 * 130;
      } catch { /* ignore */ }
    },
    siren(on, dt) {
      if (!context || !sirenGain) return;
      try {
        if (on) {
          sirenTimer += dt;
          sirenOsc.frequency.value = Math.sin(sirenTimer * 5.2) > 0 ? 820 : 620;
          sirenGain.gain.value = 0.035;
        } else {
          sirenGain.gain.value = 0;
        }
      } catch { /* ignore */ }
    },
    shoot() { noiseBurst(0.09, 0.22); },
    pickup() { blip(660, 0.12, 'sine', 0.14); blip(990, 0.18, 'sine', 0.12); },
    crash() { noiseBurst(0.25, 0.3); blip(70, 0.25, 'sawtooth', 0.18); },
    busted() { blip(440, 0.15, 'square', 0.1); blip(330, 0.3, 'square', 0.1); },
    stinger() {
      [523, 659, 784, 1046].forEach((freq, i) => {
        setTimeout(() => blip(freq, 0.35, 'triangle', 0.12), i * 110);
      });
    },
  };
}
