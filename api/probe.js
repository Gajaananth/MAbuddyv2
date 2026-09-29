export default function handler(req, res) {
    res.json({ message: "ZIUM Karuppu GRID PROBE", version: "v6.0.0-PROBE", timestamp: new Date().toISOString() });
}
