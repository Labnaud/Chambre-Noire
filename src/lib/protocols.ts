import type { RoastLevel } from '../types';

/* ------------------------------------------------------------------ *
 * V60 brew protocols.
 *
 * Reference data, like DRINK_SPECS: what a brew should be, transcribed
 * from the recipe sheets rather than computed. The tables are kept
 * verbatim because they are not perfectly linear -- 14g draws 230g on
 * the 5-pour and 233g on the 2-pour -- so a formula would quietly
 * disagree with the sheet.
 * ------------------------------------------------------------------ */

export type ProtocolId = 'v60-2-pours' | 'v60-5-pours' | 'v60-iced';

export interface PourStep {
    label: string;
    /** Seconds from the start of the bloom, or null when it is not timed. */
    at: number | null;
    /** Cumulative grams of water once this pour is finished. */
    cumulative: number;
}

export interface ProtocolStep {
    dose: number;
    pours: PourStep[];
    /** Bloom range where the sheet gives one rather than a fixed figure. */
    bloomRange?: [number, number];
    ice?: number;
    hotWater?: number;
}

export interface BrewProtocol {
    id: ProtocolId;
    name: string;
    summary: string;
    ratio: string;
    drawdown: string;
    steps: ProtocolStep[];
    method: string[];
    note?: string;
}

// Bloom is given as a 2-3x range on this sheet, so both ends are kept.
const TWO_POURS: [number, number, number, number, number][] = [
    // dose, bloomMin, bloomMax, pour1 (60%), total (100%)
    [12, 24, 36, 120, 200],
    [13, 26, 39, 130, 217],
    [14, 28, 42, 140, 233],
    [15, 30, 45, 150, 250],
    [16, 32, 48, 160, 267],
    [17, 34, 51, 170, 283],
    [18, 36, 54, 180, 300],
    [19, 38, 57, 190, 317],
    [20, 40, 60, 200, 333],
];

// Cumulative totals at each stage, straight from the sheet.
const FIVE_POURS: [number, number, number, number, number, number][] = [
    // dose, bloom (20%), 40%, 60%, 80%, 100%
    [12, 40, 80, 120, 160, 200],
    [13, 44, 88, 132, 176, 220],
    [14, 46, 92, 138, 184, 230],
    [15, 50, 100, 150, 200, 250],
    [16, 54, 108, 162, 216, 270],
    [17, 56, 112, 168, 224, 280],
    [18, 60, 120, 180, 240, 300],
    [19, 64, 128, 192, 256, 320],
    [20, 66, 132, 198, 264, 330],
];

const ICED: [number, number, number, number, number][] = [
    // dose, total water, ice, hot water, bloom
    [12, 196, 80, 116, 36],
    [13, 212, 87, 125, 39],
    [14, 229, 93, 136, 42],
    [15, 245, 100, 145, 45],
    [16, 261, 107, 154, 48],
    [17, 278, 113, 165, 51],
    [18, 294, 120, 174, 54],
];

export const BREW_PROTOCOLS: BrewProtocol[] = [
    {
        id: 'v60-2-pours',
        name: 'V60 2 Pours',
        summary: 'Bloom, then two pours. The everyday recipe.',
        ratio: '1:16.6 (60 g/L)',
        drawdown: '3:00-3:30',
        steps: TWO_POURS.map(([dose, bMin, bMax, p1, total]) => ({
            dose,
            bloomRange: [bMin, bMax],
            pours: [
                { label: 'Bloom', at: 0, cumulative: bMin },
                { label: 'Pour 1 (60%)', at: 45, cumulative: p1 },
                { label: 'Pour 2 (100%)', at: null, cumulative: total },
            ],
        })),
        method: [
            'Heat the water, grind.',
            'Rinse the filter, preheat the V60, discard the rinse water.',
            'Coffee in, dig a well.',
            'Bloom 2-3x the dose, swirl 5s, wait 30-60s (45s standard).',
            'Pour 1 to 60% of total water, let it draw down a little.',
            'Pour 2 to 100%, one spoon stir each way, gentle swirl to level the bed.',
            'Target drawdown 3:00-3:30.',
        ],
    },
    {
        id: 'v60-5-pours',
        name: 'V60 5 Pours',
        summary: 'Bloom plus four equal pours, each added over 10s then 30s to draw down.',
        ratio: '1:16.6 (60 g/L)',
        drawdown: '3:00-3:30',
        steps: FIVE_POURS.map(([dose, bloom, p2, p3, p4, p5]) => ({
            dose,
            pours: [
                { label: 'Bloom (20%)', at: 0, cumulative: bloom },
                { label: 'Pour 2 (40%)', at: 45, cumulative: p2 },
                { label: 'Pour 3 (60%)', at: 90, cumulative: p3 },
                { label: 'Pour 4 (80%)', at: 120, cumulative: p4 },
                { label: 'Pour 5 (100%)', at: 150, cumulative: p5 },
            ],
        })),
        method: [
            'Heat the water, grind.',
            'Rinse the filter, preheat the V60, discard the rinse water.',
            'Coffee in, dig a small well.',
            'Bloom about 3x the dose, swirl 5s, wait 30s (45s standard).',
            'Add 20% of total water over 10s, let it draw down for 30s.',
            'Repeat until 100%.',
            'Target drawdown 3:00-3:30.',
        ],
    },
    {
        id: 'v60-iced',
        name: 'Iced V60',
        summary: 'Same base as 2 Pours, brewed hot onto ice. The ice counts inside the total water.',
        ratio: '1:16.3 · ice is about 41% of the water',
        drawdown: '3:00-3:30',
        steps: ICED.map(([dose, total, ice, hot, bloom]) => ({
            dose,
            ice,
            hotWater: hot,
            pours: [
                { label: 'Bloom (hot)', at: 0, cumulative: bloom },
                { label: 'Hot water target', at: 45, cumulative: hot },
                { label: 'Total incl. ice', at: null, cumulative: total },
            ],
        })),
        method: [
            'Ice into the receiving carafe.',
            'Rinsed filter, coffee, well, as for 2 Pours.',
            'Hot bloom, 45-60s.',
            'Hot pours up to the hot-water target, landing on the ice.',
            'Swirl, serve once the ice has melted, or pour over fresh ice.',
        ],
        note: 'hot water = total water - ice. Adjust the ice to taste.',
    },
];

/* Shared temperature and grind by roast, identical across the three sheets.
   The sheet carries a Très claire row that the app's roast levels do not,
   so it is listed but never auto-matched. */
export interface RoastSetting {
    roast: string;
    /** The app's roast level, when one corresponds. */
    level: RoastLevel | null;
    tempC: string;
    grind: number;
}

export const V60_ROAST_SETTINGS: RoastSetting[] = [
    { roast: 'Très claire', level: null, tempC: '95-96', grind: 45 },
    { roast: 'Claire', level: 'Light', tempC: '92-96', grind: 50 },
    { roast: 'Moyenne', level: 'Medium', tempC: '85-95', grind: 60 },
    { roast: 'Moyenne-foncée', level: 'Medium-Dark', tempC: '80-90', grind: 65 },
    { roast: 'Foncée', level: 'Dark', tempC: '80-85', grind: 75 },
];

export const V60_DIAL_IN =
    'Grind first. Too fast or watery, go finer. Stalling or bitter, go coarser. '
    + 'Astringent, which is not the same as bitter, go slightly coarser and agitate less.';

export function protocolById(id: ProtocolId): BrewProtocol | undefined {
    return BREW_PROTOCOLS.find(p => p.id === id);
}

/** The sheet row for a dose, or the closest one when the dose is off-table. */
export function stepForDose(protocol: BrewProtocol, dose: number): ProtocolStep {
    return protocol.steps.reduce((best, s) =>
        Math.abs(s.dose - dose) < Math.abs(best.dose - dose) ? s : best);
}
