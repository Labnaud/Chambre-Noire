import { useState } from 'react';
import type { BeanProfile, BrewMethod } from '../../types';
import { useFocusTrap } from '../../hooks';
import Icons from '../Icons';

interface TastingNotesModalProps {
    /** Undefined when the bean is not in the library yet; saving creates it. */
    bean: BeanProfile | undefined;
    beanName: string;
    method: BrewMethod;
    onSave: (notes: string) => void;
    onSkip: () => void;
}

// Shown the moment a bean and method first land on a Balanced shot. That is
// when the profile is established and a flavour note finally means something.
// The roaster's notes seed the field, since they are usually close and easier
// to edit than to retype.
export default function TastingNotesModal({ bean, beanName, method, onSave, onSkip }: TastingNotesModalProps) {
    const modalRef = useFocusTrap<HTMLDivElement>();
    const [notes, setNotes] = useState(bean?.flavorNotes ?? '');

    return (
        <div className="modal-overlay" onClick={onSkip}>
            <div
                ref={modalRef}
                className="modal modal--confirm"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="tasting-notes-title"
            >
                <div className="modal__header">
                    <h2 id="tasting-notes-title">
                        <Icons.Sparkles /> Sweet spot
                    </h2>
                    <button className="modal__close" aria-label="Close" onClick={onSkip}>
                        <Icons.X />
                    </button>
                </div>

                <div className="modal__body">
                    <p className="modal__desc">
                        You just dialled in <strong>{beanName}</strong> as {method}. How does it taste?
                    </p>

                    {bean?.flavorNotes && (
                        <p className="tasting-prompt__roaster">
                            <span className="tasting-prompt__roaster-label">Roaster&apos;s notes</span>
                            {bean.flavorNotes}
                        </p>
                    )}

                    <div className="form-group">
                        <label className="form-label" htmlFor="tasting-notes-field">
                            {beanName} as {method}
                        </label>
                        <textarea
                            id="tasting-notes-field"
                            className="form-input form-input--textarea"
                            rows={3}
                            autoFocus
                            placeholder={method === 'Espresso'
                                ? 'e.g. nutty, dense, cocoa finish'
                                : 'e.g. fruity, jammy, bright acidity'}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                        <p className="tasting-prompt__hint">
                            {bean?.flavorNotes
                                ? 'Prefilled from the bag. Edit it to what you actually taste.'
                                : bean
                                    ? 'Saved against this bean for this method only.'
                                    : `Saving adds "${beanName}" to your Bean Library.`}
                        </p>
                    </div>
                </div>

                <div className="modal__footer modal__footer--confirm">
                    <button className="btn btn--secondary" onClick={onSkip}>
                        Not now
                    </button>
                    <button
                        className="btn-submit"
                        onClick={() => onSave(notes.trim())}
                        disabled={!notes.trim()}
                    >
                        Save notes
                    </button>
                </div>
            </div>
        </div>
    );
}
