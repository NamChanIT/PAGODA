import { useEffect, useRef } from 'react';
function useAmbientAudio() {
  const audioRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const reverbRef = useRef<ConvolverNode | null>(null);
  const ambientRef = useRef<{
    source: AudioBufferSourceNode;
    lowpass: BiquadFilterNode;
    highpass: BiquadFilterNode;
    gain: GainNode;
    lfo: OscillatorNode;
    lfoGain: GainNode;
    chimeTimeout: number;
  } | null>(null);

  const getContext = () => {
    const AudioCtor = window.AudioContext || ((window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null);
    if (!AudioCtor) return null;
    if (!audioRef.current || audioRef.current.state === 'closed') {
      const ctx = new AudioCtor();
      audioRef.current = ctx;
      const master = ctx.createGain();
      master.gain.value = 0.78;
      master.connect(ctx.destination);
      masterRef.current = master;

      const reverb = ctx.createConvolver();
      const impulseLength = Math.floor(ctx.sampleRate * 3.2);
      const impulse = ctx.createBuffer(2, impulseLength, ctx.sampleRate);
      for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
        const samples = impulse.getChannelData(channel);
        for (let index = 0; index < impulseLength; index += 1) {
          const progress = index / impulseLength;
          samples[index] = (Math.random() * 2 - 1) * Math.pow(1 - progress, 3.8) * (1 - progress * 0.25);
        }
      }
      reverb.buffer = impulse;
      const reverbLevel = ctx.createGain();
      reverbLevel.gain.value = 0.24;
      reverb.connect(reverbLevel);
      reverbLevel.connect(master);
      reverbRef.current = reverb;
    }
    if (audioRef.current.state === 'suspended') {
      void audioRef.current.resume().catch(() => {});
    }
    return audioRef.current;
  };

  const playChime = (distant = false) => {
    const ctx = getContext();
    const master = masterRef.current;
    const reverb = reverbRef.current;
    if (!ctx || !master || !reverb) return;

    const now = ctx.currentTime;
    const baseFrequency = distant ? 660 + Math.random() * 125 : 515 + Math.random() * 55;
    const distanceScale = distant ? 0.34 : 1;
    const partials = [
      { ratio: 1, level: 0.16, decay: distant ? 4.1 : 3.4 },
      { ratio: 2.71, level: 0.095, decay: distant ? 2.5 : 2.1 },
      { ratio: 5.08, level: 0.046, decay: distant ? 1.65 : 1.35 },
      { ratio: 8.67, level: 0.022, decay: distant ? 1.1 : 0.82 },
      { ratio: 13.2, level: 0.01, decay: distant ? 0.72 : 0.52 },
    ];

    partials.forEach((partial, index) => {
      const oscillator = ctx.createOscillator();
      const envelope = ctx.createGain();
      const pan = ctx.createStereoPanner();
      const frequency = baseFrequency * partial.ratio;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.detune.setValueAtTime((Math.random() - 0.5) * 5, now);
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, partial.level * distanceScale), now + 0.008 + index * 0.002);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + partial.decay);
      pan.pan.value = distant ? (Math.random() - 0.5) * 0.65 : (Math.random() - 0.5) * 0.18;
      oscillator.connect(envelope);
      envelope.connect(pan);
      pan.connect(master);
      pan.connect(reverb);
      oscillator.start(now);
      oscillator.stop(now + partial.decay + 0.04);
    });

    const strikeBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.045), ctx.sampleRate);
    const strikeSamples = strikeBuffer.getChannelData(0);
    for (let index = 0; index < strikeSamples.length; index += 1) {
      strikeSamples[index] = (Math.random() * 2 - 1) * Math.exp(-index / (strikeSamples.length * 0.12));
    }
    const strike = ctx.createBufferSource();
    const strikeFilter = ctx.createBiquadFilter();
    const strikeGain = ctx.createGain();
    strike.buffer = strikeBuffer;
    strikeFilter.type = 'bandpass';
    strikeFilter.frequency.value = distant ? 1800 : 2600;
    strikeFilter.Q.value = 0.8;
    strikeGain.gain.setValueAtTime(distant ? 0.025 : 0.075, now);
    strikeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    strike.connect(strikeFilter);
    strikeFilter.connect(strikeGain);
    strikeGain.connect(master);
    strikeGain.connect(reverb);
    strike.start(now);
  };

  const startAmbient = () => {
    const ctx = getContext();
    const master = masterRef.current;
    if (!ctx || !master || ambientRef.current) return;

    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 5, ctx.sampleRate);
    const noiseSamples = noiseBuffer.getChannelData(0);
    let filteredNoise = 0;
    for (let index = 0; index < noiseSamples.length; index += 1) {
      filteredNoise = filteredNoise * 0.985 + (Math.random() * 2 - 1) * 0.015;
      noiseSamples[index] = filteredNoise * 18;
    }

    const source = ctx.createBufferSource();
    const highpass = ctx.createBiquadFilter();
    const lowpass = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    source.buffer = noiseBuffer;
    source.loop = true;
    highpass.type = 'highpass';
    highpass.frequency.value = 90;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 520;
    lowpass.Q.value = 0.35;
    gain.gain.value = 0.0001;
    gain.gain.exponentialRampToValueAtTime(0.022, ctx.currentTime + 1.8);
    lfo.type = 'sine';
    lfo.frequency.value = 0.075;
    lfoGain.gain.value = 0.008;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(master);
    source.start();
    lfo.start();

    ambientRef.current = { source, lowpass, highpass, gain, lfo, lfoGain, chimeTimeout: 0 };
    const scheduleDistantChime = () => {
      if (!ambientRef.current) return;
      ambientRef.current.chimeTimeout = window.setTimeout(() => {
        if (!ambientRef.current) return;
        playChime(true);
        scheduleDistantChime();
      }, 18000 + Math.random() * 18000);
    };
    scheduleDistantChime();
  };

  const stopAmbient = () => {
    if (!ambientRef.current) return;
    window.clearTimeout(ambientRef.current.chimeTimeout);
    ambientRef.current.source.stop();
    ambientRef.current.lfo.stop();
    ambientRef.current.gain.disconnect();
    ambientRef.current.lowpass.disconnect();
    ambientRef.current.highpass.disconnect();
    ambientRef.current.lfoGain.disconnect();
    ambientRef.current = null;
  };

  useEffect(() => () => {
    stopAmbient();
    void audioRef.current?.close().catch(() => {});
    audioRef.current = null;
    masterRef.current = null;
  }, []);

  return { playChime, startAmbient, stopAmbient, unlockAudio: getContext };
}

export { useAmbientAudio };
