export var util = {};
export var debug = false;

(function () {
    util.zero = function (num) {
        if (num < 10) return '0' + num;
        return num;
    };

    util.htmlEntities = function (str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };

    util.formatSize = function (bytes) {
        if (bytes === '?') return bytes;

        // Get size precision (number of decimal places from the preferences)
        // and make sure it's within limits.
        var sizePrecision = 2;
        sizePrecision = sizePrecision > 2 ? 2 : sizePrecision;
        sizePrecision = sizePrecision < -1 ? -1 : sizePrecision;

        if (sizePrecision === -1) return bytes + ' B';

        var a = Math.pow(10, sizePrecision);

        if (bytes === -1) {
            return '-1';
        } else if (bytes === undefined) {
            return '?';
        } else if (bytes === 0) {
            return '0';
        } else if (bytes < 1024) {
            return bytes + ' B';
        } else if (bytes < 1024 * 1024) {
            return Math.round((bytes / 1024) * a) / a + ' KB';
        } else {
            return Math.round((bytes / (1024 * 1024)) * a) / a + ' MB';
        }
    };

    var os;
    util.getOS = function () {
        if (!os) {
            var clientStrings = [
                    {
                        s: 'Windows 95',
                        r: /(Windows 95|Win95|Windows_95)/,
                        short: 'Win',
                    },
                    {
                        s: 'Windows ME',
                        r: /(Win 9x 4.90|Windows ME)/,
                        short: 'Win',
                    },
                    {
                        s: 'Windows 98',
                        r: /(Windows 98|Win98)/,
                        short: 'Win',
                    },
                    {
                        s: 'Windows CE',
                        r: /Windows CE/,
                        short: 'Win',
                    },

                    {
                        s: 'Windows 3.11',
                        r: /Win16/,
                        short: 'Win',
                    },
                    {
                        s: 'Windows 2000',
                        r: /(Windows 2000|Windows NT 5.0)/,
                        short: 'Win',
                    },
                    {
                        s: 'Windows XP',
                        r: /(Windows XP|Windows NT 5.1)/,
                        short: 'Win',
                    },
                    {
                        s: 'Windows XP x64',
                        r: /Windows NT 5.2/,
                        short: 'Win',
                    },
                    {
                        s: 'Windows Vista',
                        r: /Windows NT 6.0/,
                        short: 'Win',
                    },
                    {
                        s: 'Windows 7',
                        r: /(Windows 7|Windows NT 6.1)/,
                        short: 'Win',
                    },
                    {
                        s: 'Windows 8',
                        r: /(Windows 8|Windows NT 6.2)/,
                        short: 'Win',
                    },
                    {
                        s: 'Windows 8.1',
                        r: /(Windows 8.1|Windows NT 6.3)/,
                        short: 'Win',
                    },
                    {
                        s: 'Windows 10',
                        r: /(Windows 10|Windows NT 10.0)/,
                        short: 'Win',
                    },
                    {
                        s: 'Windows NT 4.0',
                        r: /(Windows NT 4.0|WinNT4.0|WinNT|Windows NT)/,
                        short: 'Win',
                    },

                    //	{s:'Android', r:/Android/, short:'Android'},
                    {
                        s: 'Linux',
                        r: /(Linux|X11)/,
                        short: 'Linux',
                    },
                    //	{s:'iOS', r:/(iPhone|iPad|iPod)/, short:'iOS'},
                    {
                        s: 'Mac OS X',
                        r: /Mac OS X/,
                        short: 'Mac',
                    },
                    {
                        s: 'Mac OS',
                        r: /(MacPPC|MacIntel|Mac_PowerPC|Macintosh)/,
                        short: 'Mac',
                    },
                    {
                        s: 'UNIX',
                        r: /UNIX/,
                        short: 'Unix',
                    },
                ],
                nav = navigator.userAgent,
                id,
                cs;

            for (id in clientStrings) {
                cs = clientStrings[id];
                if (cs.r.test(nav)) {
                    os = cs;
                    break;
                }
            }
        }

        return os;
    };

    // Prevent large strings from polluting the tree labels
    util.getSnippet = function (val) {
        var str = String(val);
        if (str.length > 15) str = str.substr(0, 15) + '...';
        return str;
    };
})();
