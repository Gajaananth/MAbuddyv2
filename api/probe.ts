export default function handler(req: any, res: any) {
    res.json({ message: "ZIUM NOVA GRID PROBE", version: "v6.0.0-PROBE", timestamp: new Date().toISOString() });
}
