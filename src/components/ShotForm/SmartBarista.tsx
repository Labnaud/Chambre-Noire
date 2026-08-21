import { useState } from 'react';
import type { BeanProfile, ShotLog, Rating, BrewMethod } from '../../types';
import type { SuggestedSettings } from '../../lib/suggestions';
import { getFreshnessAlert, getDaysSinceRoast, isDialedIn } from '../../lib/beans';
import { getBeanInventory } from '../../lib/inventory';
import { getEspressoStartingPoint, getFreshnessGrindNote, getBaristaTip } from '../../lib/suggestions';
import { extractionLabel } from '../../lib/ratings';
import { profileFor } from '../../lib/brew';
import StartingPointCard from './StartingPointCard';
import MethodNotes from './MethodNotes';
import SuggestionCard from '../SuggestionCard';
import Icons from '../Icons';

interface SmartBaristaProps {
    beanName: string;
    method: BrewMethod;
    beans: BeanProfile[];
    shots: ShotLog[];
    lastShot: ShotLog | null;
    suggestion: SuggestedSettings | null;
    ratingConfig: Record<Rating, { icon: () => React.JSX.Element; colorClass: string }>;
    ratingColors: Record<Rating, string>;
    onApply: () => void;
    repeatRecipe: ShotLog | null;
    onLogAgain: () => void;
    onApplyStartingPoint: (doseIn: number, doseOut: number, grind: number) => void;
    onUpdateBean: (bean: BeanProfile) => void;
}

// Sits inside the form between the brew shape and the dials: by this point the
// bean and method are known, so the guidance is specific, and the grind and
// temperature controls it talks about are directly below it.
export default function SmartBarista({
    beanName, method, beans, shots, lastShot, suggestion,
    ratingConfig, ratingColors, onApply, repeatRecipe, onLogAgain, onApplyStartingPoint, onUpdateBean,
}: SmartBaristaProps) {
    const [openBadge, setOpenBadge] = useState<string | null>(null);

    const freshness = getFreshnessAlert(beanName, beans);

    const key = beanName.trim().toLowerCase();
    const profile = key ? beans.find(b => b.name.toLowerCase() === key) : undefined;
    const inventory = profile ? getBeanInventory(profile, shots) : null;
    const showInventory = inventory !== null && (inventory.isLow || inventory.isEmpty);

    // With no history for this bean on this method there is nothing to learn
    // from, so fall back to the documented starting point for its roast.
    const isEspresso = profileFor(method).ratioStyle === 'espresso';
    const startingPoint = isEspresso ? getEspressoStartingPoint(profile?.roastLevel) : null;
    const showStartingPoint = isEspresso && lastShot === null && beanName.trim() !== '';

    /**
     * The three things worth knowing at a glance -- how the bean is keeping, how
     * much is left, and where the last shot landed -- read as one line of
     * status. Each carries a sentence of reasoning, which is worth having but
     * not worth three permanent paragraphs above the controls, so the badge is
     * the summary and the reasoning opens on demand. One at a time, so the
     * panel below never pushes the form around by more than a line or two.
     */
    const badges: {
        id: string;
        label: string;
        detail: string;
        color?: string;
        tone?: string;
        Icon?: () => React.JSX.Element;
    }[] = [];

    if (freshness) {
        badges.push({
            id: 'freshness',
            label: freshness.label,
            detail: freshness.text,
            color: freshness.color,
        });
    }

    if (showInventory && profile && inventory) {
        badges.push({
            id: 'inventory',
            label: inventory.isEmpty ? 'Empty' : 'Low bag',
            detail: inventory.isEmpty
                ? `Your ${profile.name} bag is out. Time to restock.`
                : `About ${inventory.gramsLeft}g (~${inventory.shotsLeft} shots) of ${profile.name} left.`,
            color: inventory.isEmpty ? 'var(--color-very-bitter)' : 'var(--color-sour)',
        });
    }

    if (lastShot?.rating) {
        const tip = getBaristaTip(lastShot.rating);
        badges.push({
            id: 'extraction',
            label: extractionLabel(lastShot.rating),
            detail: tip.message,
            tone: ratingConfig[lastShot.rating].colorClass,
            Icon: ratingConfig[lastShot.rating].icon,
        });
    }

    const openDetail = badges.find(b => b.id === openBadge)?.detail ?? null;

    return (
        <section className="smart-barista" aria-label="Smart Barista">
            <div className="smart-barista__header">
                <h3 className="smart-barista__title">
                    <Icons.ChefHat /> Smart Barista
                </h3>

                {badges.length > 0 && (
                    <div className="smart-barista__badges">
                        {badges.map(({ id, label, color, tone, Icon }) => (
                            <button
                                key={id}
                                type="button"
                                className={`status-badge${tone ? ` status-badge--${tone}` : ''}${openBadge === id ? ' status-badge--open' : ''}`}
                                style={color ? { borderColor: color, color } : undefined}
                                aria-expanded={openBadge === id}
                                onClick={() => setOpenBadge(openBadge === id ? null : id)}
                                title="Why?"
                            >
                                {Icon && <Icon />}
                                {label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {openDetail && <p className="smart-barista__detail">{openDetail}</p>}

            {showStartingPoint && (
                <StartingPointCard
                    beanName={beanName}
                    roastLevel={profile?.roastLevel}
                    startingPoint={startingPoint}
                    freshnessNote={getFreshnessGrindNote(getDaysSinceRoast(profile?.roastDate))}
                    onApply={onApplyStartingPoint}
                />
            )}

            <SuggestionCard
                lastShot={lastShot}
                suggestion={suggestion}
                beanName={beanName}
                method={method}
                ratingColors={ratingColors}
                onApply={onApply}
            />

            {/* Shown whenever this bean and method have reached Balanced, not
                only when the last shot did: a repeat that has not been tasted
                would otherwise take the button away with it. */}
            {repeatRecipe && (
                <button
                    type="button"
                    className="btn-log-again"
                    onClick={onLogAgain}
                    title="Log a brew of the dialled-in recipe now, without filling in the form"
                >
                    <Icons.Check /> Log again
                </button>
            )}

            {profile?.flavorNotes && (
                <p className="roaster-notes">
                    <span className="roaster-notes__label">Roaster&apos;s notes</span>
                    {profile.flavorNotes}
                </p>
            )}

            <MethodNotes
                key={`${profile?.id ?? 'none'}:${method}`}
                bean={profile}
                beanName={beanName}
                method={method}
                dialedIn={isDialedIn(beanName, shots, method)}
                onUpdateBean={onUpdateBean}
            />
        </section>
    );
}
