import type { BeanProfile, ShotLog, Rating, BrewMethod } from '../../types';
import type { SuggestedSettings } from '../../lib/suggestions';
import { getFreshnessAlert } from '../../lib/beans';
import { getBeanInventory } from '../../lib/inventory';
import SuggestionCard from '../SuggestionCard';
import Icons from '../Icons';

interface SmartBaristaProps {
    beanName: string;
    method: BrewMethod;
    beans: BeanProfile[];
    shots: ShotLog[];
    lastShot: ShotLog | null;
    suggestion: SuggestedSettings | null;
    shotsForBean: ShotLog[];
    ratingConfig: Record<Rating, { icon: () => React.JSX.Element; colorClass: string }>;
    ratingColors: Record<Rating, string>;
    onApply: () => void;
}

// Sits inside the form between the brew shape and the dials: by this point the
// bean and method are known, so the guidance is specific, and the grind and
// temperature controls it talks about are directly below it.
export default function SmartBarista({
    beanName, method, beans, shots, lastShot, suggestion, shotsForBean,
    ratingConfig, ratingColors, onApply,
}: SmartBaristaProps) {
    const freshness = getFreshnessAlert(beanName, beans);

    const key = beanName.trim().toLowerCase();
    const profile = key ? beans.find(b => b.name.toLowerCase() === key) : undefined;
    const inventory = profile ? getBeanInventory(profile, shots) : null;
    const showInventory = inventory !== null && (inventory.isLow || inventory.isEmpty);

    return (
        <section className="smart-barista" aria-label="Smart Barista">
            <h3 className="smart-barista__title">
                <Icons.ChefHat /> Smart Barista
            </h3>

            {freshness && (
                <div className={`freshness-alert freshness-alert--${freshness.variant}`}>
                    <span className="freshness-alert__badge" style={{ background: freshness.color }}>
                        {freshness.label}
                    </span>
                    <span className="freshness-alert__text">{freshness.text}</span>
                </div>
            )}

            {showInventory && profile && inventory && (
                <div className={`freshness-alert freshness-alert--${inventory.isEmpty ? 'stale' : 'fading'}`}>
                    <span
                        className="freshness-alert__badge"
                        style={{ background: inventory.isEmpty ? 'var(--color-very-bitter)' : 'var(--color-sour)' }}
                    >
                        {inventory.isEmpty ? 'Empty' : 'Low Bag'}
                    </span>
                    <span className="freshness-alert__text">
                        {inventory.isEmpty
                            ? `Your ${profile.name} bag is out. Time to restock.`
                            : `About ${inventory.gramsLeft}g (~${inventory.shotsLeft} shots) of ${profile.name} left.`}
                    </span>
                </div>
            )}

            <SuggestionCard
                lastShot={lastShot}
                suggestion={suggestion}
                shotsForBean={shotsForBean}
                beanName={beanName}
                method={method}
                ratingConfig={ratingConfig}
                ratingColors={ratingColors}
                onApply={onApply}
            />
        </section>
    );
}
