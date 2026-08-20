import type { useShotForm } from '../../hooks/useShotForm';
import type { SavedRecipe } from '../../types';
import { BASKETS, STRENGTHS, GRIND_MIN, GRIND_MAX } from '../../constants';
import { describeBrew, profileFor } from '../../lib/brew';
import { useFocusTrap } from '../../hooks';
import Icons from '../Icons';

interface RecipeEditorModalProps {
    open: boolean;
    form: ReturnType<typeof useShotForm>;
    recipeName: string;
    setRecipeName: (v: string) => void;
    editingRecipe: SavedRecipe | null;
    onSave: () => void;
    onCancel: () => void;
}

export default function RecipeEditorModal({
    open,
    form,
    recipeName,
    setRecipeName,
    editingRecipe,
    onSave,
    onCancel,
}: RecipeEditorModalProps) {
    const modalRef = useFocusTrap<HTMLDivElement>();
    if (!open) return null;
    const isEdit = editingRecipe !== null;

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div
                ref={modalRef}
                className="modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="recipe-editor-title"
            >
                <div className="modal__header">
                    <h3 id="recipe-editor-title">{isEdit ? <><Icons.Edit /> Edit Recipe</> : 'Save as Recipe'}</h3>
                    <button className="modal__close" aria-label="Close" onClick={onCancel}>
                        <Icons.X />
                    </button>
                </div>
                <div className="modal__body">
                    {!isEdit && (
                        <p className="modal__desc">
                            Save your current settings as a quick recipe for "{form.beanName}"
                        </p>
                    )}
                    <div className="form-group">
                        <label className="form-label">Recipe Name</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. My Sunday Vanilla Latte"
                            value={recipeName}
                            onChange={(e) => setRecipeName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {isEdit && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Bean Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={form.beanName}
                                    onChange={(e) => form.setBeanName(e.target.value)}
                                />
                            </div>

                            <div className="edit-recipe__grid">
                                <div className="form-group">
                                    <label className="form-label">Grind Size</label>
                                    <input
                                        type="number"
                                        className="form-input form-input--sm"
                                        min={GRIND_MIN}
                                        max={GRIND_MAX}
                                        value={form.grindSize}
                                        onChange={(e) => form.setGrindSize(Number(e.target.value))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Basket</label>
                                    <div className="pill-group pill-group--sm">
                                        {BASKETS.map((b) => (
                                            <button
                                                key={b}
                                                type="button"
                                                className={`pill-btn pill-btn--sm ${form.basket === b ? 'pill-btn--active' : ''}`}
                                                onClick={() => form.setBasket(b)}
                                                aria-pressed={form.basket === b}
                                            >
                                                {b}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {profileFor(form.method).hasWaterTemp && (
                                <div className="form-group">
                                    <label className="form-label" htmlFor="recipe-water-temp">
                                        Water Temperature ({form.waterTempC} &deg;C)
                                    </label>
                                    <input
                                        id="recipe-water-temp"
                                        type="range"
                                        className="slider slider--thick"
                                        min={profileFor(form.method).tempRangeC[0]}
                                        max={profileFor(form.method).tempRangeC[1]}
                                        step={1}
                                        value={form.waterTempC}
                                        onChange={(e) => form.setWaterTempC(Number(e.target.value))}
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Strength</label>
                                <div className="pill-group pill-group--sm">
                                    {STRENGTHS.map((s) => (
                                        <button
                                            key={s.value}
                                            type="button"
                                            className={`pill-btn pill-btn--sm ${form.strength === s.value ? 'pill-btn--active' : ''}`}
                                            onClick={() => form.setStrength(s.value)}
                                            aria-pressed={form.strength === s.value}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Add-Ins / Notes</label>
                                <textarea
                                    className="form-input form-input--textarea"
                                    placeholder="e.g. Vanilla syrup, extra foam, specific techniques..."
                                    value={form.notes}
                                    onChange={(e) => form.setNotes(e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </>
                    )}

                    <div className="modal__preview">
                        <div className="modal__preview-label">{isEdit ? 'Updated recipe:' : 'Will save:'}</div>
                        <div className="setting-tags-wrap">
                            <span className="setting-tag">{describeBrew({ method: form.method, pourPattern: form.pourPattern, iced: form.iced, drink: undefined })}</span>
                            <span className="setting-tag">{form.beanName}</span>
                            <span className="setting-tag">Grind {form.grindSize}</span>
                            {profileFor(form.method).hasWaterTemp && <span className="setting-tag">{form.waterTempC} &deg;C</span>}
                            {form.method === 'Espresso' && <span className="setting-tag">{form.basket}</span>}
                            <span className="setting-tag">Str {form.strength}</span>
                            {form.showDrink && <span className="setting-tag setting-tag--milk">{form.milkType} {form.drink}</span>}
                            {form.notes && <span className="setting-tag">{form.notes}</span>}
                        </div>
                    </div>
                </div>
                <div className="modal__footer">
                    <button className="btn-cancel" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        className="btn-submit"
                        onClick={onSave}
                        disabled={!recipeName.trim()}
                    >
                        {isEdit ? 'Update Recipe' : 'Save Recipe'}
                    </button>
                </div>
            </div>
        </div>
    );
}
