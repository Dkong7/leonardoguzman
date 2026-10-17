// Motor de Teoría Musical y Lógica de Mapeo del Diapasón

export const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type PitchClass = typeof PITCH_CLASSES[number];

export interface TuningDefinition {
  id: string;
  name: string;
  // De 1ra cuerda (más aguda, arriba en diagrama o abajo según vista) a 6ta cuerda (más grave)
  // Guardamos MIDI notes de la 6ta cuerda (índice 0: más grave) a la 1ra cuerda (índice 5: más aguda)
  midiNotes: number[];
  labels: string[];
}

export const TUNINGS: Record<string, TuningDefinition> = {
  standard: {
    id: 'standard',
    name: 'Estándar (E A D G B E)',
    midiNotes: [40, 45, 50, 55, 59, 64], // E2, A2, D3, G3, B3, E4
    labels: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  },
  dropD: {
    id: 'dropD',
    name: 'Drop D (D A D G B E)',
    midiNotes: [38, 45, 50, 55, 59, 64],
    labels: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  },
  ebStandard: {
    id: 'ebStandard',
    name: 'Eb Estándar (D# G# C# F# A# D#)',
    midiNotes: [39, 44, 49, 54, 58, 63],
    labels: ['D#2', 'G#2', 'C#3', 'F#3', 'A#3', 'D#4'],
  },
  openG: {
    id: 'openG',
    name: 'Open G (D G D G B D)',
    midiNotes: [38, 43, 50, 55, 59, 62],
    labels: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'],
  },
  openD: {
    id: 'openD',
    name: 'Open D (D A D F# A D)',
    midiNotes: [38, 45, 50, 54, 57, 62],
    labels: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'],
  },
  dadgad: {
    id: 'dadgad',
    name: 'DADGAD (D A D G A D)',
    midiNotes: [38, 45, 50, 55, 57, 62],
    labels: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'],
  },
};

export interface ScaleDefinition {
  id: string;
  name: string;
  shortName: string;
  // Máscara binaria de 12 semitonos desde la tónica (0..11)
  mask: [number, number, number, number, number, number, number, number, number, number, number, number];
  intervals: Record<number, string>;
  category: 'pentatonic' | 'diatonic' | 'harmonic';
}

export const SCALES: Record<string, ScaleDefinition> = {
  minorPentatonic: {
    id: 'minorPentatonic',
    name: 'Pentatónica Menor',
    shortName: 'Pent. Menor',
    mask: [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0],
    intervals: { 0: '1', 3: 'b3', 5: '4', 7: '5', 10: 'b7' },
    category: 'pentatonic',
  },
  majorPentatonic: {
    id: 'majorPentatonic',
    name: 'Pentatónica Mayor',
    shortName: 'Pent. Mayor',
    mask: [1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
    intervals: { 0: '1', 2: '2', 4: '3', 7: '5', 9: '6' },
    category: 'pentatonic',
  },
  blues: {
    id: 'blues',
    name: 'Escala de Blues',
    shortName: 'Blues',
    mask: [1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0],
    intervals: { 0: '1', 3: 'b3', 5: '4', 6: 'b5', 7: '5', 10: 'b7' },
    category: 'pentatonic',
  },
  major: {
    id: 'major',
    name: 'Mayor (Jónico)',
    shortName: 'Mayor',
    mask: [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1],
    intervals: { 0: '1', 2: '2', 4: '3', 5: '4', 7: '5', 9: '6', 11: '7' },
    category: 'diatonic',
  },
  naturalMinor: {
    id: 'naturalMinor',
    name: 'Menor Natural (Eólico)',
    shortName: 'Menor Nat.',
    mask: [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0],
    intervals: { 0: '1', 2: '2', 3: 'b3', 5: '4', 7: '5', 8: 'b6', 10: 'b7' },
    category: 'diatonic',
  },
  dorian: {
    id: 'dorian',
    name: 'Dórico (Dorian)',
    shortName: 'Dórico',
    mask: [1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0],
    intervals: { 0: '1', 2: '2', 3: 'b3', 5: '4', 7: '5', 9: '6', 10: 'b7' },
    category: 'diatonic',
  },
  phrygian: {
    id: 'phrygian',
    name: 'Frigio (Phrygian)',
    shortName: 'Frigio',
    mask: [1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0],
    intervals: { 0: '1', 1: 'b2', 3: 'b3', 5: '4', 7: '5', 8: 'b6', 10: 'b7' },
    category: 'diatonic',
  },
  lydian: {
    id: 'lydian',
    name: 'Lidio (Lydian)',
    shortName: 'Lidio',
    mask: [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
    intervals: { 0: '1', 2: '2', 4: '3', 6: '#4', 7: '5', 9: '6', 11: '7' },
    category: 'diatonic',
  },
  mixolydian: {
    id: 'mixolydian',
    name: 'Mixolidio (Mixolydian)',
    shortName: 'Mixolidio',
    mask: [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0],
    intervals: { 0: '1', 2: '2', 4: '3', 5: '4', 7: '5', 9: '6', 10: 'b7' },
    category: 'diatonic',
  },
  harmonicMinor: {
    id: 'harmonicMinor',
    name: 'Menor Armónica',
    shortName: 'Men. Armónica',
    mask: [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1],
    intervals: { 0: '1', 2: '2', 3: 'b3', 5: '4', 7: '5', 8: 'b6', 11: '7' },
    category: 'harmonic',
  },
};

export type NoteRole = 'root' | 'third' | 'fifth' | 'blue' | 'scale' | 'out';

export interface FretNode {
  stringIndex: number; // 0 = 6ta cuerda (grave), 5 = 1ra cuerda (aguda)
  stringNumber: number; // 6 a 1
  fret: number; // 0 a 24
  midi: number;
  frequency: number;
  pitchClassIndex: number; // 0..11
  noteName: PitchClass;
  fullNoteName: string;
  inScale: boolean;
  inBox: boolean;
  intervalLabel: string;
  role: NoteRole;
}

export interface ScaleCandidate {
  rootIndex: number;
  rootName: PitchClass;
  scaleId: string;
  scaleName: string;
  score: number; // 0..1
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function freqToMidi(freq: number): { midi: number; cents: number } {
  const exactMidi = 69 + 12 * Math.log2(freq / 440);
  const midi = Math.round(exactMidi);
  const cents = Math.round((exactMidi - midi) * 100);
  return { midi, cents };
}

/**
 * Calcula los rangos de trastes para las 5 cajas (posiciones CAGED / Pentatónicas)
 * dada una nota raíz y el tipo de escala.
 */
export function getBoxFretRange(rootIndex: number, boxNumber: number): [number, number] | null {
  if (boxNumber <= 0 || boxNumber > 5) return null;
  // Traste de la tónica en la 6ta cuerda (E2 = pitchClass 4)
  const rootFretOn6th = (rootIndex - 4 + 12) % 12;
  const boxOffsets: [number, number][] = [
    [0, 3],   // Caja 1 (Tónica en 6ta)
    [2, 6],   // Caja 2
    [4, 8],   // Caja 3
    [7, 11],  // Caja 4
    [9, 13],  // Caja 5
  ];
  const [startOffset, endOffset] = boxOffsets[boxNumber - 1];
  const start = (rootFretOn6th + startOffset) % 12;
  const end = start + (endOffset - startOffset);
  return [start, end];
}

/**
 * Función generadora: Nota(cuerda, traste) = PitchBase[cuerda] + traste
 */
export function generateFretboardMatrix(
  tuningId: string,
  totalFrets: number,
  rootIndex: number,
  scaleId: string,
  boxNumber: number = 0 // 0 = Todo el mástil, 1..5 = Caja específica
): FretNode[][] {
  const tuning = TUNINGS[tuningId] || TUNINGS.standard;
  const scale = SCALES[scaleId] || SCALES.minorPentatonic;
  const boxRange = getBoxFretRange(rootIndex, boxNumber);

  const matrix: FretNode[][] = [];

  for (let s = 0; s < 6; s++) {
    const baseMidi = tuning.midiNotes[s];
    const row: FretNode[] = [];

    for (let f = 0; f <= totalFrets; f++) {
      const midi = baseMidi + f;
      const pitchClassIndex = ((midi % 12) + 12) % 12;
      const noteName = PITCH_CLASSES[pitchClassIndex];
      const octave = Math.floor(midi / 12) - 1;
      const semitonesFromRoot = (pitchClassIndex - rootIndex + 12) % 12;
      const inScale = scale.mask[semitonesFromRoot] === 1;
      const intervalLabel = scale.intervals[semitonesFromRoot] || '';

      let role: NoteRole = 'out';
      if (inScale) {
        if (semitonesFromRoot === 0) role = 'root';
        else if (semitonesFromRoot === 3 || semitonesFromRoot === 4) role = 'third';
        else if (semitonesFromRoot === 6) role = 'blue';
        else if (semitonesFromRoot === 7) role = 'fifth';
        else role = 'scale';
      }

      let inBox = inScale;
      if (boxRange && inScale) {
        const [bStart, bEnd] = boxRange;
        inBox = (f >= bStart && f <= bEnd) || (f >= bStart + 12 && f <= bEnd + 12);
      }

      row.push({
        stringIndex: s,
        stringNumber: 6 - s,
        fret: f,
        midi,
        frequency: midiToFreq(midi),
        pitchClassIndex,
        noteName,
        fullNoteName: `${noteName}${octave}`,
        inScale,
        inBox,
        intervalLabel,
        role,
      });
    }
    matrix.push(row);
  }

  return matrix;
}

/**
 * Compara el vector de cromas acumulado (12 dimensiones: C, C#, D, ..., B)
 * contra las máscaras binarias de todas las tonalidades y escalas.
 */
export function identifyScaleFromChroma(chromaVector: number[]): ScaleCandidate[] {
  const maxVal = Math.max(...chromaVector, 0.0001);
  const normChroma = chromaVector.map((v) => v / maxVal);
  const totalEnergy = normChroma.reduce((acc, v) => acc + v, 0);

  if (totalEnergy < 0.15) {
    return [];
  }

  const candidates: ScaleCandidate[] = [];

  for (let root = 0; root < 12; root++) {
    for (const scale of Object.values(SCALES)) {
      let inScaleEnergy = 0;
      let outScalePenalty = 0;
      let maskCount = 0;

      for (let pc = 0; pc < 12; pc++) {
        const interval = (pc - root + 12) % 12;
        const isMember = scale.mask[interval] === 1;
        const weight = interval === 0 ? 1.35 : interval === 3 || interval === 4 || interval === 7 ? 1.15 : 1.0;

        if (isMember) {
          inScaleEnergy += normChroma[pc] * weight;
          maskCount += weight;
        } else {
          outScalePenalty += normChroma[pc] * 1.1;
        }
      }

      // Favorecer ligeramente escalas pentatónicas/blues si explican bien las notas tocadas
      const simplicityBonus = scale.category === 'pentatonic' ? 1.06 : 1.0;
      const rawScore = ((inScaleEnergy / Math.max(1, totalEnergy)) - (outScalePenalty / Math.max(1, totalEnergy)) * 0.65) * simplicityBonus;
      const score = Math.max(0, Math.min(1, rawScore));

      candidates.push({
        rootIndex: root,
        rootName: PITCH_CLASSES[root],
        scaleId: scale.id,
        scaleName: scale.name,
        score,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 5);
}

/**
 * Distancia normalizada real de un traste f en un diapasón de N trastes
 * Usando la ley acústica 1 - 2^(-f/12) normalizada al largo total de N trastes.
 */
export function getNormalizedFretPosition(fret: number, totalFrets: number): number {
  if (fret <= 0) return 0;
  const maxScale = 1 - Math.pow(2, -totalFrets / 12);
  const pos = 1 - Math.pow(2, -fret / 12);
  return pos / maxScale;
}
