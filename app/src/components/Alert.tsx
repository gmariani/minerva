import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Overlay } from './Overlay';

export type AlertTitle = 'Error' | 'Information' | 'Notice' | 'Warning' | 'Alert';
type ShowAlert = (message: ReactNode, title?: AlertTitle) => void;

const AlertContext = createContext<ShowAlert>(() => {});

export function useAlert(): ShowAlert {
    return useContext(AlertContext);
}

export function AlertProvider({ children }: { children: ReactNode }) {
    const [alert, setAlert] = useState<{ message: ReactNode; title: AlertTitle } | null>(null);
    const [open, setOpen] = useState(false);

    const show = useCallback<ShowAlert>((message, title = 'Alert') => {
        setAlert({ message, title });
        setOpen(true);
    }, []);

    return (
        <AlertContext.Provider value={show}>
            {children}
            <Overlay id="alertOverlay" show={open} onClose={() => setOpen(false)}>
                <div id="alertWindow" className="show">
                    <h1>{alert?.title}</h1>
                    {typeof alert?.message === 'string' ? <p>{alert.message}</p> : alert?.message}
                    <input type="button" id="btnAlertOk" className="send cancel show" value="Ok" onClick={() => setOpen(false)} />
                </div>
            </Overlay>
        </AlertContext.Provider>
    );
}
