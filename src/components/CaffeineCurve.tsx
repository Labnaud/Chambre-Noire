import type { CurvePoint } from '../lib/caffeine';

interface CaffeineCurveProps {
    curve: CurvePoint[];
    targetMg: number;
    bedtimeAt: Date;
    now: Date;
}

const W = 520;
const H = 200;
const PAD_L = 34;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 22;

// 24h decay curve with the bedtime marker and the target threshold. Drawn as
// SVG rather than canvas so it re-skins across all six themes and stays crisp.
export default function CaffeineCurve({ curve, targetMg, bedtimeAt, now }: CaffeineCurveProps) {
    if (curve.length < 2) return null;

    const t0 = curve[0].at.getTime();
    const t1 = curve[curve.length - 1].at.getTime();
    const span = t1 - t0 || 1;
    const peak = Math.max(...curve.map(p => p.mg), targetMg, 10) * 1.15;

    const innerW = W - PAD_L - PAD_R;
    const innerH = H - PAD_T - PAD_B;
    const x = (at: Date) => PAD_L + ((at.getTime() - t0) / span) * innerW;
    const y = (mg: number) => PAD_T + innerH - (mg / peak) * innerH;

    const line = curve.map(p => `${x(p.at).toFixed(1)},${y(p.mg).toFixed(1)}`).join(' ');
    const area = `${PAD_L},${PAD_T + innerH} ${line} ${(PAD_L + innerW).toFixed(1)},${PAD_T + innerH}`;

    const hours = [0, 6, 12, 18, 24].map(h => new Date(t0 + h * 3600_000)).filter(d => d.getTime() <= t1);
    const inRange = (d: Date) => d.getTime() >= t0 && d.getTime() <= t1;

    const peakLabel = Math.round(peak);
    const summary =
        `Caffeine level over ${Math.round(span / 3600_000)} hours, peaking near ${peakLabel} mg,`
        + ` with a ${targetMg} mg target at bedtime.`;

    return (
        <svg className="caffeine-curve" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
            <polygon className="caffeine-curve__area" points={area} />
            <polyline className="caffeine-curve__line" fill="none" points={line} />

            {hours.map(d => (
                <g key={d.getTime()}>
                    <line
                        className="caffeine-curve__grid"
                        x1={x(d)} y1={PAD_T} x2={x(d)} y2={PAD_T + innerH}
                    />
                    <text className="caffeine-curve__tick" x={x(d)} y={H - 6} textAnchor="middle">
                        {String(d.getHours()).padStart(2, '0')}:00
                    </text>
                </g>
            ))}

            <text className="caffeine-curve__tick" x={4} y={PAD_T + 8}>{peakLabel}</text>
            <text className="caffeine-curve__tick" x={4} y={PAD_T + innerH}>0</text>

            {targetMg > 0 && (
                <line
                    className="caffeine-curve__target"
                    x1={PAD_L} y1={y(targetMg)} x2={PAD_L + innerW} y2={y(targetMg)}
                />
            )}

            {inRange(bedtimeAt) && (
                <line
                    className="caffeine-curve__bedtime"
                    x1={x(bedtimeAt)} y1={PAD_T} x2={x(bedtimeAt)} y2={PAD_T + innerH}
                />
            )}

            {inRange(now) && (
                <line
                    className="caffeine-curve__now"
                    x1={x(now)} y1={PAD_T} x2={x(now)} y2={PAD_T + innerH}
                />
            )}
        </svg>
    );
}
