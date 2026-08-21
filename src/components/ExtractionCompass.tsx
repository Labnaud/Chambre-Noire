import type { ShotLog, Rating } from '../types';
import { RATINGS, RATING_COLORS, STRENGTHS, TARGET_STRENGTH, BALANCED_RATING_INDEX } from '../constants';

interface ExtractionCompassProps {
    /** Oldest first. Unrated shots are skipped: they have no extraction axis. */
    shots: ShotLog[];
}

const W = 280;
const H = 180;
const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 14;
const PAD_B = 28;

const COLS = RATINGS.length;        // extraction, sour to bitter
const ROWS = STRENGTHS.length;      // strength, weak at the bottom

// Strength 3 (Overwhelming) sits at the top, 1 (Weak) at the bottom.
const rowFor = (strength: number) => ROWS - strength;
const colFor = (rating: Rating) => RATINGS.indexOf(rating);

const SWEET_COL = BALANCED_RATING_INDEX;
const SWEET_ROW = rowFor(TARGET_STRENGTH);

// After Barista Hustle's Espresso Compass: extraction across, strength up,
// sweet spot in the middle. The grid is positional only and never drawn --
// the sweet circle and the end labels carry the orientation.
export default function ExtractionCompass({ shots }: ExtractionCompassProps) {
    const rated = shots.filter(s => s.rating && s.strength !== undefined);
    if (rated.length === 0) return null;

    const innerW = W - PAD_L - PAD_R;
    const innerH = H - PAD_T - PAD_B;
    const cw = innerW / COLS;
    const ch = innerH / ROWS;

    const centreX = (c: number) => PAD_L + c * cw + cw / 2;
    const centreY = (r: number) => PAD_T + r * ch + ch / 2;

    // Shots landing in the same cell spiral out from its centre, so a repeated
    // result reads as several dots rather than one.
    const seen = new Map<string, number>();
    const points = rated.map((s, i) => {
        const key = `${colFor(s.rating!)}:${rowFor(s.strength!)}`;
        const n = seen.get(key) ?? 0;
        seen.set(key, n + 1);
        const spread = n === 0 ? 0 : Math.min(cw, ch) * 0.24;
        return {
            id: s.id,
            n: i + 1,
            x: centreX(colFor(s.rating!)) + Math.cos(n * 2.4) * spread,
            y: centreY(rowFor(s.strength!)) + Math.sin(n * 2.4) * spread,
            colour: RATING_COLORS[s.rating!],
            latest: i === rated.length - 1,
            label: `${s.rating} · ${STRENGTHS.find(x => x.value === s.strength)?.label}`,
        };
    });

    // One arrow per hop, pulled back off the dots so the head stays visible.
    const hops = points.slice(1).map((to, i) => {
        const from = points[i];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy);
        if (len < 12) return null; // same cell: an arrow would be a smudge
        const ux = dx / len;
        const uy = dy / len;
        return {
            key: `${from.id}-${to.id}`,
            x1: from.x + ux * 7, y1: from.y + uy * 7,
            x2: to.x - ux * 9, y2: to.y - uy * 9,
        };
    }).filter(Boolean) as { key: string; x1: number; y1: number; x2: number; y2: number }[];

    const last = points[points.length - 1];
    const sweetR = Math.min(cw, ch) * 0.78;

    return (
        <svg
            className="compass"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Extraction compass across ${rated.length} rated shots, latest ${last.label}.`}
        >
            <defs>
                <marker id="compass-hop" markerWidth="5" markerHeight="5" refX="4.2" refY="2.5" orient="auto">
                    <path d="M0,0 L5,2.5 L0,5 Z" className="compass__arrowhead" />
                </marker>
            </defs>

            {/* the target zone, not a cell */}
            <circle
                className="compass__sweet"
                cx={centreX(SWEET_COL)} cy={centreY(SWEET_ROW)} r={sweetR}
            />
            <circle
                className="compass__sweet-core"
                cx={centreX(SWEET_COL)} cy={centreY(SWEET_ROW)} r={sweetR * 0.45}
            />

            {hops.map(h => (
                <line
                    key={h.key}
                    className="compass__hop"
                    x1={h.x1} y1={h.y1} x2={h.x2} y2={h.y2}
                    markerEnd="url(#compass-hop)"
                />
            ))}

            {points.map(p => (
                <g key={p.id}>
                    <circle
                        className={p.latest ? 'compass__dot compass__dot--latest' : 'compass__dot'}
                        cx={p.x} cy={p.y} r={p.latest ? 6.5 : 5}
                        style={{ fill: p.colour }}
                    />
                    <text className="compass__dot-n" x={p.x} y={p.y + 2.6} textAnchor="middle">{p.n}</text>
                </g>
            ))}

            {/* extraction, along the bottom */}
            <text className="compass__axis" x={PAD_L + innerW / 2} y={H - 4} textAnchor="middle">
                Extraction &rarr;
            </text>
            <text className="compass__end" x={PAD_L} y={H - PAD_B + 10}>sour</text>
            <text className="compass__end" x={PAD_L + innerW} y={H - PAD_B + 10} textAnchor="end">bitter</text>

            {/* strength, up the side */}
            <text
                className="compass__axis"
                transform={`translate(10 ${PAD_T + innerH / 2}) rotate(-90)`}
                textAnchor="middle"
            >
                Strength &rarr;
            </text>
            <text
                className="compass__end"
                transform={`translate(26 ${PAD_T + 2}) rotate(-90)`}
                textAnchor="end"
            >
                overwhelming
            </text>
            <text
                className="compass__end"
                transform={`translate(26 ${PAD_T + innerH}) rotate(-90)`}
            >
                weak
            </text>
        </svg>
    );
}
