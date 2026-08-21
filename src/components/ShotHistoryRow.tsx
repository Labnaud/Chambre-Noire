import type { ShotLog, Rating } from '../types';
import { formatDate } from '../lib/format';
import { getRatioLabel } from '../lib/dialIn';
import { describeBrew, hotWaterGrams, formatDuration } from '../lib/brew';
import Icons from './Icons';

interface ShotHistoryRowProps {
    shot: ShotLog;
    isFavorite: boolean;
    isSelected?: boolean;
    justLogged?: boolean;
    use24Hour: boolean;
    ratingConfig: Record<Rating, { icon: () => React.JSX.Element; colorClass: string }>;
    onSelect: (shot: ShotLog) => void;
    onOpen?: (shot: ShotLog) => void;
    onToggleFavorite: (shot: ShotLog) => void;
    onEdit: (shot: ShotLog) => void;
    onDelete: (id: string) => void;
}

// Shared between the dashboard side panel and the History modal so the two
// can never drift in density or layout again.
export default function ShotHistoryRow({
    shot,
    isFavorite,
    isSelected,
    justLogged,
    use24Hour,
    ratingConfig,
    onSelect,
    onOpen,
    onToggleFavorite,
    onEdit,
    onDelete,
}: ShotHistoryRowProps) {
    const config = shot.rating ? ratingConfig[shot.rating] : null;
    const ShotIcon = config?.icon;
    const ratioLabel = getRatioLabel(shot.doseIn, shot.doseOut, shot.method);

    return (
        <div
            className={`history-item history-item--clickable ${isFavorite ? 'history-item--favorite' : ''} ${isSelected ? 'history-item--selected' : ''} ${justLogged ? 'history-item--just-logged' : ''}`}
        >
            <button
                type="button"
                className="history-item__review"
                onClick={() => onSelect(shot)}
                onDoubleClick={onOpen ? () => onOpen(shot) : undefined}
            >
                <span className={`history-item__rating ${config ? `history-item__rating--${config.colorClass}` : 'history-item__rating--unrated'}`} title={config ? undefined : 'Not rated yet'}>
                    {ShotIcon ? <ShotIcon /> : <span className="rating-unrated-mark" aria-hidden="true">?</span>}
                </span>
                <span className="history-item__details">
                    <span className="history-item__bean">{shot.beanName}</span>
                    <span className="history-item__meta">
                        {describeBrew(shot)} • {formatDate(shot.timestamp, use24Hour)}
                    </span>
                    <span className="history-item__settings">
                        <span className="setting-tag">Grind {shot.grindSize}</span>
                        {shot.waterTempC !== undefined && <span className="setting-tag">{shot.waterTempC} &deg;C</span>}
                        {shot.method === 'Espresso' && <span className="setting-tag">{shot.basket}</span>}
                        {shot.iced && shot.iceGrams !== undefined && (
                            <span className="setting-tag">{shot.iceGrams}g ice &rarr; {hotWaterGrams(shot)}g hot</span>
                        )}
                        {shot.strength !== undefined && <span className="setting-tag">Str {shot.strength}</span>}
                        {shot.score !== undefined && (
                            <span className="setting-tag setting-tag--score">
                                <Icons.Star filled /> {shot.score.toFixed(1)}
                            </span>
                        )}
                        {shot.extractionTime && (
                            <span className="setting-tag setting-tag--timer"><Icons.Timer /> {formatDuration(shot.extractionTime)}</span>
                        )}
                        {shot.doseIn && shot.doseOut && (
                            <span className="setting-tag setting-tag--dose">
                                {shot.doseIn}→{shot.doseOut}g (1:{(shot.doseOut / shot.doseIn).toFixed(1)})
                                {ratioLabel && <span className="ratio-label">{ratioLabel}</span>}
                            </span>
                        )}
                        {shot.drink && (
                            <span className="setting-tag setting-tag--milk">
                                {shot.milkType ? `${shot.milkType} ` : ''}{shot.drink}
                            </span>
                        )}
                    </span>
                    {shot.notes && <span className="history-item__notes">{shot.notes}</span>}
                </span>
            </button>
            <div className="history-item__actions">
                <button
                    className={`star-btn ${isFavorite ? 'star-btn--active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(shot); }}
                    title={isFavorite ? 'Remove from favorites' : 'Set as target recipe'}
                    aria-label={isFavorite ? 'Remove from favorites' : 'Set as target recipe'}
                    aria-pressed={isFavorite}
                >
                    <Icons.Star filled={isFavorite} />
                </button>
                <button
                    className="history-item__edit-btn"
                    onClick={(e) => { e.stopPropagation(); onEdit(shot); }}
                    title="Edit shot"
                    aria-label="Edit shot"
                >
                    <Icons.Edit />
                </button>
                <button
                    className="history-item__delete-btn"
                    onClick={(e) => { e.stopPropagation(); onDelete(shot.id); }}
                    title="Delete shot"
                    aria-label="Delete shot"
                >
                    <Icons.Trash />
                </button>
            </div>
        </div>
    );
}
