import type { ReactNode } from 'react';

// The modal shell all dialogs share; children are the windows, shown with the "show" class
export function Overlay({ id, show, onClose, children }: { id: string; show: boolean; onClose: () => void; children: ReactNode }) {
    return (
        <div id={id} className={'overlay' + (show ? ' show' : '')}>
            <section>
                <div className="controls">
                    <button type="button" className="cancel-icon close-top" aria-label="Close" onClick={onClose} />
                </div>
                <div className="forms">{children}</div>
            </section>
        </div>
    );
}
