export function formatSize(bytes: number | '?' | undefined): string {
    if (bytes === '?' || bytes === undefined) return '?';
    if (bytes === -1) return '-1';
    if (bytes === 0) return '0';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round((bytes / 1024) * 100) / 100 + ' KB';
    return Math.round((bytes / (1024 * 1024)) * 100) / 100 + ' MB';
}

export interface OSInfo {
    name: string;
    short: 'Win' | 'Mac' | 'Linux' | 'Unix';
}

const OS_LIST: Array<{ name: string; re: RegExp; short: OSInfo['short'] }> = [
    { name: 'Windows 95', re: /(Windows 95|Win95|Windows_95)/, short: 'Win' },
    { name: 'Windows ME', re: /(Win 9x 4.90|Windows ME)/, short: 'Win' },
    { name: 'Windows 98', re: /(Windows 98|Win98)/, short: 'Win' },
    { name: 'Windows CE', re: /Windows CE/, short: 'Win' },
    { name: 'Windows 3.11', re: /Win16/, short: 'Win' },
    { name: 'Windows 2000', re: /(Windows 2000|Windows NT 5.0)/, short: 'Win' },
    { name: 'Windows XP', re: /(Windows XP|Windows NT 5.1)/, short: 'Win' },
    { name: 'Windows XP x64', re: /Windows NT 5.2/, short: 'Win' },
    { name: 'Windows Vista', re: /Windows NT 6.0/, short: 'Win' },
    { name: 'Windows 7', re: /(Windows 7|Windows NT 6.1)/, short: 'Win' },
    { name: 'Windows 8', re: /(Windows 8|Windows NT 6.2)/, short: 'Win' },
    { name: 'Windows 8.1', re: /(Windows 8.1|Windows NT 6.3)/, short: 'Win' },
    { name: 'Windows 10', re: /(Windows 10|Windows NT 10.0)/, short: 'Win' },
    { name: 'Windows NT 4.0', re: /(Windows NT 4.0|WinNT4.0|WinNT|Windows NT)/, short: 'Win' },
    { name: 'Linux', re: /(Linux|X11)/, short: 'Linux' },
    { name: 'Mac OS X', re: /Mac OS X/, short: 'Mac' },
    { name: 'Mac OS', re: /(MacPPC|MacIntel|Mac_PowerPC|Macintosh)/, short: 'Mac' },
    { name: 'UNIX', re: /UNIX/, short: 'Unix' },
];

export function getOS(): OSInfo | undefined {
    const os = OS_LIST.find((o) => o.re.test(navigator.userAgent));
    return os && { name: os.name, short: os.short };
}

export function saveFile(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    // Give the browser time to start the download before releasing the blob
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// "3 days ago" / "in 2 hours"
const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 365 * 24 * 3600],
    ['month', 30 * 24 * 3600],
    ['day', 24 * 3600],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
];
export function timeAgo(date: Date): string {
    const seconds = (date.getTime() - Date.now()) / 1000;
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    for (const [unit, size] of RELATIVE_UNITS) {
        if (Math.abs(seconds) >= size || unit === 'second') return rtf.format(Math.round(seconds / size), unit);
    }
    return '';
}

// The sort setting lives in a cookie (as it did before) so it survives the upgrade
export function getCookie(name: string): string | undefined {
    const match = document.cookie.split('; ').find((c) => c.startsWith(name + '='));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

export function setCookie(name: string, value: string, days: number): void {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
}
