// Decodes SOL files with Adobe's BlazeDS AMF readers and prints each file as JSON (one line per file),
// for compare.mjs to check against Minerva. Run through run.sh, which fetches the BlazeDS jars.
// Usage: java -cp "lib/*" SolCheck.java <file.sol>...
//
// Values are printed as plain JSON, except: dates {"$date": ms}, XML {"$xml": true} (BlazeDS gives a DOM),
// dictionaries {"$dict": [[key, value], ...]}, an object met again inside itself {"$cycle": true}.
import flex.messaging.io.SerializationContext;
import flex.messaging.io.amf.*;
import java.io.*;
import java.lang.reflect.*;
import java.nio.file.*;
import java.util.*;

public class SolCheck {
    static String q(String s) {
        StringBuilder b = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            if (c == '"' || c == '\\') b.append('\\').append(c);
            else if (c < 0x20 || (c >= 0xd800 && c <= 0xdfff)) b.append(String.format("\\u%04x", (int) c));
            else b.append(c);
        }
        return b.append('"').toString();
    }

    static String json(Object o, IdentityHashMap<Object, Boolean> seen) {
        if (o == null) return "null";
        if (o instanceof String s) return q(s);
        if (o instanceof Boolean || o instanceof Integer || o instanceof Long || o instanceof Short) return o.toString();
        if (o instanceof Number n) { double d = n.doubleValue(); return Double.isNaN(d) || Double.isInfinite(d) ? q(String.valueOf(d)) : (d == Math.rint(d) && Math.abs(d) < 1e15 ? String.valueOf((long) d) : String.valueOf(d)); }
        if (o instanceof Date d) return "{\"$date\":" + d.getTime() + "}";
        if (o instanceof org.w3c.dom.Document) return "{\"$xml\":true}";
        if (o instanceof byte[] b) { StringBuilder s = new StringBuilder("["); for (int i = 0; i < b.length; i++) s.append(i > 0 ? "," : "").append(b[i] & 0xff); return s.append("]").toString(); }
        if (seen.containsKey(o)) return "{\"$cycle\":true}";
        seen.put(o, true);
        try {
            if (o.getClass().isArray()) { StringBuilder s = new StringBuilder("["); int n = Array.getLength(o); for (int i = 0; i < n; i++) s.append(i > 0 ? "," : "").append(json(Array.get(o, i), seen)); return s.append("]").toString(); }
            if (o instanceof Collection<?> c) { StringBuilder s = new StringBuilder("["); int i = 0; for (Object v : c) s.append(i++ > 0 ? "," : "").append(json(v, seen)); return s.append("]").toString(); }
            if (o instanceof Dictionary<?, ?> d) { StringBuilder s = new StringBuilder("{\"$dict\":["); int i = 0; for (Enumeration<?> k = d.keys(); k.hasMoreElements();) { Object key = k.nextElement(); s.append(i++ > 0 ? "," : "").append("[").append(json(key, seen)).append(",").append(json(d.get(key), seen)).append("]"); } return s.append("]}").toString(); }
            if (o instanceof Map<?, ?> m) { StringBuilder s = new StringBuilder("{"); int i = 0; for (Map.Entry<?, ?> e : m.entrySet()) s.append(i++ > 0 ? "," : "").append(q(String.valueOf(e.getKey()))).append(":").append(json(e.getValue(), seen)); return s.append("}").toString(); }
            return "{\"$java\":" + q(o.getClass().getName()) + "}";
        } finally { seen.remove(o); }
    }

    static void setField(Object o, String name, Object v) {
        try { Field f = o.getClass().getField(name); f.set(o, v); } catch (Exception ignored) {}
    }

    public static void main(String[] args) throws Exception {
        for (String path : args) {
            String name = Paths.get(path).getFileName().toString();
            StringBuilder out = new StringBuilder("{\"file\":" + q(name));
            try {
                byte[] bytes = Files.readAllBytes(Paths.get(path));
                DataInputStream din = new DataInputStream(new ByteArrayInputStream(bytes));
                din.readUnsignedShort(); din.readInt(); din.skipBytes(4 + 6);
                din.skipBytes(din.readUnsignedShort());
                int ver = din.readInt();
                SerializationContext ctx = new SerializationContext();
                setField(ctx, "createASObjectForMissingType", true);
                setField(ctx, "instantiateTypes", false);
                setField(ctx, "allowXml", true); // DOCTYPEs and external entities stay disabled
                // BlazeDS refuses to create unlisted classes; allow only the collections AMF data needs
                ctx.setDeserializationValidator(new flex.messaging.validators.DeserializationValidator() {
                    final Set<String> allowed = Set.of("java.lang.String", "java.lang.Boolean", "java.lang.Integer", "java.lang.Long", "java.lang.Double", "java.lang.Number", "org.w3c.dom.Document", "java.util.Hashtable", "java.util.HashMap", "java.util.ArrayList", "java.util.Date",
                        "[Ljava.lang.Integer;", "[Ljava.lang.Long;", "[Ljava.lang.Double;", "[Ljava.lang.Object;", "[I", "[J", "[D", "[B",
                        "flex.messaging.io.amf.ASObject", "flex.messaging.io.ArrayCollection", "flex.messaging.io.ArrayList", "flex.messaging.io.ObjectProxy");
                    public boolean validateCreation(Class<?> c) { return allowed.contains(c.getName()); }
                    public boolean validateAssignment(Object o, String p, Object v) { return true; }
                    public boolean validateAssignment(Object o, int i, Object v) { return true; }
                    public void initialize(String id, flex.messaging.config.ConfigMap m) {}
                });
                SerializationContext.setSerializationContext(ctx);
                AbstractAmfInput in = ver == 3 ? new Amf3Input(ctx) : new Amf0Input(ctx);
                in.setInputStream(din);
                Method readName = (ver == 3 ? Amf3Input.class : Amf0Input.class).getDeclaredMethod("readString");
                readName.setAccessible(true);
                StringBuilder data = new StringBuilder("{");
                int count = 0;
                while (din.available() > 1) {
                    String key = (String) readName.invoke(in);
                    Object v = in.readObject();
                    din.readUnsignedByte(); // padding
                    data.append(count++ > 0 ? "," : "").append(q(key)).append(":").append(json(v, new IdentityHashMap<>()));
                }
                out.append(",\"amf\":").append(ver).append(",\"ok\":true,\"data\":").append(data).append("}");
            } catch (Throwable e) {
                Throwable c = e instanceof InvocationTargetException ite ? ite.getCause() : e;
                out.append(",\"ok\":false,\"error\":").append(q(c.getClass().getSimpleName() + ": " + String.valueOf(c.getMessage())));
            }
            System.out.println(out.append("}"));
        }
    }
}
