// The parts around the editor: navigation, sidebar header, footer and the About window
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Overlay } from './Overlay';
import changelog from '../changelog.txt?raw';
import { formatSize } from '../util';
import type { FileInfo } from '../types';

declare global {
    interface Window {
        adsbygoogle?: unknown[];
    }
}

interface NavProps {
    // A file (or its error placeholder) is loaded
    fileOpen: boolean;
    // ...and it has data to save or export
    hasData: boolean;
    onNew: () => void;
    onOpen: () => void;
    onImport: () => void;
    onExport: () => void;
    onSave: () => void;
    onClose: () => void;
    onAbout: () => void;
}

export function Nav({ fileOpen, hasData, onNew, onOpen, onImport, onExport, onSave, onClose, onAbout }: NavProps) {
    const item = (id: string, label: string, title: string, action: () => void, enabled = true) => (
        <li>
            <a
                id={id}
                href="#"
                className={enabled ? undefined : 'disabled'}
                aria-disabled={!enabled}
                title={title}
                onClick={(e: MouseEvent) => {
                    e.preventDefault();
                    if (enabled) action();
                }}
            >
                {label}
            </a>
        </li>
    );
    return (
        <nav>
            <ul>
                {item('newFile', 'New', 'Create a new file', onNew)}
                {item('openFile', 'Open', 'Open file', onOpen)}
                {item('importFile', 'Import', 'Import JSON to file', onImport)}
                {item('exportFile', 'Export', 'Export file to JSON', onExport, hasData)}
                {item('saveFile', 'Save', 'Save file', onSave, hasData)}
                {item('closeFile', 'Close', 'Close file', onClose, fileOpen)}
                <li className="spacer" />
                <li>
                    <a href="https://github.com/gmariani/minerva/issues" target="_blank" rel="noopener" title="Report a bug">
                        Support
                    </a>
                </li>
                {item('about', 'About', 'About .minerva', onAbout)}
            </ul>
        </nav>
    );
}

export function FileTitle({ file, amfVersion }: { file: FileInfo | null; amfVersion: number | '?' | undefined }) {
    if (!file) return <header id="title" />;
    return (
        <header id="title">
            <h1>{file.name}</h1>
            <small>
                File Size: {formatSize(file.size)} | AMF Version: {amfVersion ?? '?'} | Last Modified:{' '}
                {file.lastModified ? new Date(file.lastModified).toLocaleDateString() : 'n/a'}
            </small>
        </header>
    );
}

export function SearchField({ onSearch }: { onSearch: (text: string) => void }) {
    const [text, setText] = useState('');
    const timer = useRef<number | undefined>(undefined);
    useEffect(() => () => clearTimeout(timer.current), []);
    return (
        <div className="search clearfix">
            <div className="field">
                <label htmlFor="search_tree" className="sr-only">
                    Search
                </label>
                <input
                    type="search"
                    id="search_tree"
                    placeholder="Search"
                    value={text}
                    onChange={(e) => {
                        const value = e.target.value;
                        setText(value);
                        clearTimeout(timer.current);
                        timer.current = window.setTimeout(() => onSearch(value), 250);
                    }}
                    onKeyUp={(e) => {
                        // Clear on ESC
                        if (e.key === 'Escape') {
                            setText('');
                            clearTimeout(timer.current);
                            onSearch('');
                        }
                    }}
                />
                <span className="icon search-icon" />
            </div>
        </div>
    );
}

export function Footer() {
    const adRef = useRef<HTMLModElement>(null);
    useEffect(() => {
        // Fill the ad slot once (the AdSense script is loaded by index.html)
        if (adRef.current && !adRef.current.dataset.adsbygoogleStatus) (window.adsbygoogle = window.adsbygoogle || []).push({});
    }, []);
    return (
        <footer>
            <ins
                ref={adRef}
                className="adsbygoogle"
                style={{ display: 'inline-block', width: 728, height: 90 }}
                data-ad-client="ca-pub-4393629565174725"
                data-ad-slot="3734585686"
            >
                Ad
            </ins>
            <small className="year">
                &copy; {__BUILD_YEAR__}{' '}
                <a href="https://mariani.life" title="Mariani | Web Design, SEO, JavaScript">
                    Gabriel Mariani
                </a>
            </small>
            <small>Last built on: {__BUILT_ON__}</small>
        </footer>
    );
}

interface AboutProps {
    show: boolean;
    onClose: () => void;
    sortEnabled: boolean;
    onSortChange: (enabled: boolean) => void;
    exportTypes: boolean;
    onExportTypesChange: (enabled: boolean) => void;
}

export function AboutOverlay({ show, onClose, sortEnabled, onSortChange, exportTypes, onExportTypesChange }: AboutProps) {
    const downloads = [
        ['Minerva-3-5-0-resigned.air', 'Version 3.5.0 (Re-packaged to avoid install errors)'],
        ['Minerva-3-4-0.air', 'Version 3.4.0'],
        ['Minerva-3-3-4.air', 'Version 3.3.4'],
        ['Minerva-3-3-3.air', 'Version 3.3.3'],
        ['Minerva-3-3-2.air', 'Version 3.3.2'],
    ];
    return (
        <Overlay id="aboutOverlay" show={show} onClose={onClose}>
            <div id="aboutWindow" className="show">
                <h1>
                    .minerva ({__APP_VERSION__}.{__BUILD_ID__})
                </h1>
                <section className="clearfix">
                    <div className="row">
                        <div>
                            <img className="spin" src="/img/favicon-196x196.png" alt=".minerva's logo, a cartoon cloud" />
                        </div>
                        <div className="col about-content">
                            <p>
                                <strong>.minerva</strong> is a Flash Local Shared Object editor built based on the{' '}
                                <a href="https://www.adobe.com/content/dam/acom/en/devnet/pdf/amf-file-format-spec.pdf" target="_blank" rel="noopener">
                                    AMF3 specification
                                </a>{' '}
                                and the{' '}
                                <a href="https://www.adobe.com/content/dam/acom/en/devnet/pdf/amf0-file-format-specification.pdf" target="_blank" rel="noopener">
                                    AMF0 specification
                                </a>
                                .
                            </p>
                            <p>
                                <strong>.minerva</strong> is capable of reading and writing all known data types successfully. I do not plan on supporting older
                                browsers unless it&apos;s a trivial change. Any issues please click on the support button at the top. Below are links to the
                                legacy Adobe AIR version. These are here for those who still wish to use the discontinued AIR version.
                            </p>
                            <ul>
                                {downloads.map(([file, label]) => (
                                    <li key={file}>
                                        <a href={'https://mariani-downloads.s3.us-east-1.amazonaws.com/' + file}>{label}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <h4>Settings</h4>
                    <div>
                        <input type="checkbox" id="enableSort" name="enableSort" checked={sortEnabled} onChange={(e) => onSortChange(e.target.checked)} />
                        <label htmlFor="enableSort" className="tick">
                            <span>Enable Sidebar Sort (Re-open file to see change)</span>
                        </label>
                    </div>
                    <div>
                        <input
                            type="checkbox"
                            id="exportTypes"
                            name="exportTypes"
                            checked={exportTypes}
                            onChange={(e) => onExportTypesChange(e.target.checked)}
                        />
                        <label htmlFor="exportTypes" className="tick">
                            <span>Include data types in JSON exports (so importing restores Integers, Dates, classes, etc.)</span>
                        </label>
                    </div>

                    <h4>Changelog</h4>
                    <pre className="scroll-box">{changelog}</pre>
                </section>
            </div>
        </Overlay>
    );
}
