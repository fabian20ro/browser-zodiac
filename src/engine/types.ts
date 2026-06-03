export type Grammar = Record<string, string[]>;

export type Modifier = (input: string) => string;

export type SeededRandom = () => number; // Returns a float between 0 and 1
