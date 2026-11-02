package {
    import flash.display.Sprite;
    import flash.net.ObjectEncoding;
    import flash.net.SharedObject;
    import flash.system.fscommand;
    import flash.utils.Dictionary;
    import flash.utils.setTimeout;
    import flash.xml.XMLDocument;

    // ActionScript 3 test for Flash Player: writes SharedObjects with Flash's own encoder (AMF3, and AMF0 for the
    // reference numbering probes), then reads the SOL files Minerva wrote and traces PASS/FAIL. See README.md.
    public class FlashTest extends Sprite {
        static const EMOJI:String = "Saved 😀 at 🏰 — level 𝄞";
        static const CJK:String = "日本語のセーブデータ";
        static const KEY:String = "名前😀";
        static const XML_PRETTY:String = "<save>\n  <name>Zoë 😀</name>\n  <items>\n    <item id=\"1\"/>\n  </items>\n</save>";
        static const XMLDOC_PRETTY:String = "\n<save>\n  <item a=\"1\"/>\n  <item a=\"2\"/>\n</save>\n";

        public function FlashTest() {
            try { writeAll(); } catch (e:Error) { trace("ERROR write " + e.getStackTrace()); }
            try { readAll(); } catch (e:Error) { trace("ERROR read " + e.getStackTrace()); }
            trace("DONE");
            setTimeout(function():void { fscommand("quit"); }, 300);
        }

        static function repeat(s:String, n:int):String { var a:Array = []; a.length = n + 1; return a.join(s); }

        static function open(name:String, encoding:uint):SharedObject {
            SharedObject.defaultObjectEncoding = encoding;
            var so:SharedObject = SharedObject.getLocal(name);
            so.clear();
            return so;
        }

        static function flush(so:SharedObject, name:String):void {
            trace("WROTE " + name + " " + so.flush() + " size " + so.size);
        }

        function writeAll():void {
            var shared:Object = {tag: "shared", v: 1};
            var self:Object = {name: "loop"}; self.me = self;

            // AMF3: strings, XML, shared objects, integer limits, Dictionary, Vector.<*>
            var so:SharedObject = open("fp-amf3", ObjectEncoding.AMF3);
            var d:Object = so.data;
            d.emoji = EMOJI; d.emojiAgain = EMOJI; d.cjk = CJK; d[KEY] = "key with emoji";
            d.xmlPretty = new XML(XML_PRETTY);
            d.xmlDocPretty = new XMLDocument(XMLDOC_PRETTY);
            d.longUnicode = repeat("é", 40000);
            d.shared = shared; d.copy = shared; d.list = [shared, "x"]; d.self = self;
            var iMax:int = 268435455, iOver:int = 268435456, iMin:int = -268435456, iUnder:int = -268435457;
            d.intMax = iMax; d.intOver = iOver; d.intMin = iMin; d.intUnder = iUnder;
            d.notANumber = NaN;
            var dict:Dictionary = new Dictionary(); dict[5] = "five"; dict["k"] = 1; dict[shared] = 2;
            d.dict = dict;
            var anyVec:Vector.<*> = new Vector.<*>(); anyVec.push(1, "two", shared);
            d.anyVec = anyVec;
            flush(so, "fp-amf3");

            // AMF0: the same strings, the String/LongString byte boundaries, and references after primitives
            so = open("fp-amf0", ObjectEncoding.AMF0);
            d = so.data;
            d.first = "a string"; d.count = 5; d.shared = shared; d.copy = shared; d.list = [shared, "x"]; d.self = self;
            d.emoji = EMOJI; d.cjk = CJK; d[KEY] = "key with emoji";
            d.xmlDocPretty = new XMLDocument(XMLDOC_PRETTY);
            d.ascii65535 = repeat("a", 65535); d.ascii65536 = repeat("a", 65536);
            d.euro21845 = repeat("€", 21845); d.euro21846 = repeat("€", 21846);
            d.longUnicode = repeat("é", 40000);
            flush(so, "fp-amf0");

            // AMF0 reference numbering: do Dates and XML documents take a number? Arrays keep their order, objects don't
            var probe:Object = {tag: "shared"};
            var loop:Object = {name: "loop"}; loop.me = loop;
            so = open("as3-dates", ObjectEncoding.AMF0);
            so.data.first = "a string"; so.data.when = new Date(0); so.data.doc = new XMLDocument("<a/>");
            so.data.shared = probe; so.data.copy = probe; so.data.self = loop;
            flush(so, "as3-dates");
            so = open("as3-arr-date", ObjectEncoding.AMF0);
            so.data.arr = [new Date(0), probe, probe];
            flush(so, "as3-arr-date");
            so = open("as3-arr-xml", ObjectEncoding.AMF0);
            so.data.arr = [new XMLDocument("<a/>"), probe, probe];
            flush(so, "as3-arr-xml");

            SharedObject.defaultObjectEncoding = ObjectEncoding.AMF3;
        }

        static function check(file:String, name:String, ok:Boolean, detail:* = ""):void {
            trace("RESULT AS3 " + file + " " + name + " " + (ok ? "PASS" : "FAIL " + String(detail).substr(0, 80)));
        }

        // Minerva's Test-AMF0-References.sol uses ActionScript 2's numbering, so only the AS2 test reads it
        function readAll():void {
            var d:Object = SharedObject.getLocal("Test-AMF3-Strings").data;
            if (d.emoji === undefined) { trace("MISSING Test-AMF3-Strings"); } else {
                check("AMF3", "emoji", d.emoji === EMOJI, d.emoji);
                check("AMF3", "emojiAgain", d.emojiAgain === EMOJI, d.emojiAgain);
                check("AMF3", "cjk", d.cjk === CJK, d.cjk);
                check("AMF3", "emojiKey", d[KEY] === "key with emoji", d[KEY]);
                check("AMF3", "xmlPretty", d.xmlPretty is XML && XML(d.xmlPretty).toXMLString() == new XML(XML_PRETTY).toXMLString(), d.xmlPretty);
                check("AMF3", "xmlDocPretty", d.xmlDocPretty is XMLDocument && d.xmlDocPretty.toString() == new XMLDocument(XMLDOC_PRETTY).toString(), d.xmlDocPretty);
                check("AMF3", "longUnicode", d.longUnicode === repeat("é", 40000), String(d.longUnicode).length);
            }
            d = SharedObject.getLocal("Test-AMF0-Strings").data;
            if (d.emoji === undefined) { trace("MISSING Test-AMF0-Strings"); } else {
                check("AMF0", "emoji", d.emoji === EMOJI, d.emoji);
                check("AMF0", "cjk", d.cjk === CJK, d.cjk);
                check("AMF0", "emojiKey", d[KEY] === "key with emoji", d[KEY]);
                check("AMF0", "xmlDocPretty", d.xmlDocPretty is XMLDocument && d.xmlDocPretty.toString() == new XMLDocument(XMLDOC_PRETTY).toString(), d.xmlDocPretty);
                check("AMF0", "ascii65535", d.ascii65535 === repeat("a", 65535), String(d.ascii65535).length);
                check("AMF0", "ascii65536", d.ascii65536 === repeat("a", 65536), String(d.ascii65536).length);
                check("AMF0", "euro21845", d.euro21845 === repeat("€", 21845), String(d.euro21845).length);
                check("AMF0", "euro21846", d.euro21846 === repeat("€", 21846), String(d.euro21846).length);
                check("AMF0", "longUnicode", d.longUnicode === repeat("é", 40000), String(d.longUnicode).length);
            }
        }
    }
}
