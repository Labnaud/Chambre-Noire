import type { ShotLog, Rating } from '../types';
import { RATINGS, RATING_COLORS, STRENGTHS, TARGET_STRENGTH, BALANCED_RATING_INDEX } from '../constants';

interface ExtractionCompassProps {
    /** Oldest first. Unrated shots are skipped: they have no extraction axis. */
    shots: ShotLog[];
}

const W = 280;
const H = 176;
const PAD_L = 30;
const PAD_R = 10;
const PAD_T = 10;
const PAD_B = 26;

const COLS = RATINGS.length;        // extraction, sour to bitter
const ROWS = STRENGTHS.length;      // strength, weak at the bottom

// Strength 3 (Overwhelming) sits at the top, 1 (Weak) at the bottom.
const rowFor = (strength: number) => ROWS - strength;
const colFor = (rating: Rating) => RATINGS.indexOf(rating);

const SWEET_COL = BALANCED_RATING_INDEX;
const SWEET_ROW = rowFor(TARGET_STRENGTH);

// After the Espresso Compass: extraction along the bottom, strength up the
// side, and the sweet spot in the middle. We plot the two subjective scales
// the app records, not measured TDS and extraction yield, so cells are shaded
// by distance from the sweet cell rather than pretending to a physical band.
export default function ExtractionCompass({ shots }: ExtractionCompassProps) {
    const rated = shots.filter(s => s.rating);
    if (rated.length === 0) return null;

    const innerW = W - PAD_L - PAD_R;
    const innerH = H - PAD_T - PAD_B;
    const cw = innerW / COLS;
    const ch = innerH / ROWS;

    const cellX = (c: number) => PAD_L + c * cw;
    const cellY = (r: number) => PAD_T + r * ch;

    // Nudge shots sharing a cell so a repeated result reads as several dots.
    const seen = new Map<string, number>();
    const points = rated.map((s, i) => {
        const c = colFor(s.rating!);
        const r = rowFor(s.strength);
        const key = `${c}:${r}`;
        const n = seen.get(key) ?? 0;
        seen.set(key, n + 1);
        const angle = n * 2.4; // spiral outward from the cell centre
        const spread = n === 0 ? 0 : Math.min(cw, ch) * 0.22;
        return {
            id: s.id,
            n: i + 1,
            x: cellX(c) + cw / 2 + Math.cos(angle) * spread,
            y: cellY(r) + ch / 2 + Math.sin(angle) * spread,
            colour: RATING_COLORS[s.rating!],
            latest: i === rated.length - 1,
            label: `${s.rating} · ${STRENGTHS.find(x => x.value === s.strength)?.label}`,
        };
    });

    const path = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const last = points[points.length - 1];
    const onTarget = last.x === cellX(SWEET_COL) + cw / 2 && last.y === cellY(SWEET_ROW) + ch / 2;

    const cells = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const dist = Math.max(
                Math.abs(c - SWEET_COL) / Math.max(SWEET_COL, COLS - 1 - SWEET_COL),
                Math.abs(r - SWEET_ROW) / Math.max(SWEET_ROW, ROWS - 1 - SWEET_ROW),
            );
            cells.push(
                <rect
                    key={`${c}-${r}`}
                    className={dist === 0 ? 'compass__cell compass__cell--sweet' : 'compass__cell'}
                    x={cellX(c)} y={cellY(r)} width={cw} height={ch}
                    opacity={dist === 0 ? 1 : 0.16 + (1 - dist) * 0.34}
                />,
            );
        }
    }

    const summary =
        `Extraction compass across ${rated.length} rated shots, latest ${last.label}`
        + `${onTarget ? ', on the sweet spot' : ''}.`;

    return (
        <svg className="compass" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
            {cells}

            {/* the direction raising yield moves a shot: more extraction, less strength */}
            <line
                className="compass__yield"
                x1={cellX(SWEET_COL) + cw / 2} y1={cellY(SWEET_ROW) + ch / 2}
                x2={cellX(SWEET_COL) + cw * 1.4} y2={cellY(SWEET_ROW) + ch * 1.3}
                markerEnd="url(#compass-arrow)"
            />
            <defs>
                <marker id="compass-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" className="compass__arrowhead" />
                </marker>
            </defs>

            <polyline className="compass__path" fill="none" points={path} />

            {points.map(p => (
                <g key={p.id}>
                    <circle
                        className={p.latest ? 'compass__dot compass__dot--latest' : 'compass__dot'}
                        cx={p.x} cy={p.y} r={p.latest ? 6 : 4.5}
                        style={{ fill: p.colour }}
                    />
                    <text className="compass__dot-n" x={p.x} y={p.y + 2.6} textAnchor="middle">{p.n}</text>
                </g>
            ))}

            <text className="compass__axis" x={PAD_L + innerW / 2} y={H - 4} textAnchor="middle">
                Extraction &rarr;
            </text>
            <text
                className="compass__axis"
                transform={`translate(9 ${PAD_T + innerH / 2}) rotate(-90)`}
                textAnchor="middle"
            >
                Strength &rarr;
            </text>
            <text className="compass__corner" x={PAD_L + 2} y={H - PAD_B - 4}>sour</text>
            <text className="compass__corner" x={PAD_L + innerW - 2} y={H - PAD_B - 4} textAnchor="end">bitter</text>
        </svg>
    );
}
