import { useState } from 'react';
import type { BeanProfile, BrewMethod } from '../../types';
import Icons from '../Icons';

interface MethodNotesProps {
    bean: BeanProfile | undefined;
    beanName: string;
    method: BrewMethod;
    dialedIn: boolean;
    onUpdateBean: (bean: BeanProfile) => void;
}

// How this bean tastes on this method. Only offered once the pairing is
// dialled in: before that the note would describe a bad extraction rather
// than the bean's character.
export default function MethodNotes({ bean, beanName, method, dialedIn, onUpdateBean }: MethodNotesProps) {
    const stored = bean?.methodNotes?.[method] ?? '';
    // The parent keys this component on bean and method, so switching either
    // remounts it and the draft starts from the stored value. That is cheaper
    // and less surprising than syncing state inside an effect.
    const [draft, setDraft] = useState(stored);
    const [open, setOpen] = useState(false);

    if (!beanName.trim()) return null;

    if (!bean) {
        return dialedIn ? (
            <p className="method-notes__hint">
                Add "{beanName}" to your Bean Library to record how it tastes as {method}.
            </p>
        ) : null;
    }

    if (!dialedIn) {
        return (
            <p className="method-notes__hint">
                <Icons.Lightbulb /> Dial this in first. A flavour note on a shot that is
                still sour or bitter describes the extraction, not the bean.
            </p>
        );
    }

    const commit = () => {
        const next = draft.trim();
        if (next === stored) return;
        const methodNotes = { ...(bean.methodNotes ?? {}) };
        if (next) methodNotes[method] = next;
        else delete methodNotes[method];
        onUpdateBean({ ...bean, methodNotes });
    };

    return (
        <div className="method-notes">
            {stored && !open ? (
                <button type="button" className="method-notes__display" onClick={() => setOpen(true)}>
                    <span className="method-notes__label">As {method}</span>
                    <span className="method-notes__text">{stored}</span>
                    <Icons.Edit />
                </button>
            ) : (
                <>
                    <label className="method-notes__label" htmlFor="method-notes-field">
                        How it tastes as {method}
                    </label>
                    <textarea
                        id="method-notes-field"
                        className="form-input form-input--textarea"
                        rows={2}
                        placeholder={method === 'Espresso' ? 'e.g. nutty, dense, cocoa finish' : 'e.g. fruity, jammy, bright acidity'}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => { commit(); setOpen(false); }}
                    />
                </>
            )}
        </div>
    );
}
