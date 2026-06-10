export type InterpretationFn = (raw: string) => string;

export const readingInterpretations: Record<string, InterpretationFn> = {
  spirit_browser: (raw) => `The cosmic lens reveals a ${raw} vessel.`,
  elemental_os: (raw) => `The elements manifest through ${raw}.`,
  life_resolution: (raw) => `The physical dimension is ${raw}.`,
  soul_window: (raw) => `The astral window is ${raw}.`,
  cultural_destiny: (raw) => `The currents of destiny flow from ${raw}.`,
  soul_alignment: (raw) => `The alignment is set to ${raw}.`,
  cosmic_mood: (raw) => `The cosmic mood is currently ${raw}.`,
  parallel_lives: (raw) => `You exist across ${raw} threads.`,
  cosmic_platform: (raw) => `Rooted in the ${raw} plane.`,
  social_connectivity: (raw) => `You are ${raw}.`,
  cosmic_timezone: (raw) => `Temporal flow: ${raw}.`,
  tactile_sensibility: (raw) => `Sensing through ${raw}.`,
};
