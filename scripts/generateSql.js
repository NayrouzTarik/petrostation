import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../data/db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

let sql = `-- =========================================================================
-- STATIONHUB SUPABASE INITIAL SCHEMA & SEED
-- Copiez tout ce script et collez-le dans Supabase SQL Editor, puis cliquez sur "Run"
-- =========================================================================

CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Désactiver puis réactiver RLS avec accès anonyme public
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read app_state" ON app_state;
CREATE POLICY "Allow public read app_state" ON app_state FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert app_state" ON app_state;
CREATE POLICY "Allow public insert app_state" ON app_state FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update app_state" ON app_state;
CREATE POLICY "Allow public update app_state" ON app_state FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete app_state" ON app_state;
CREATE POLICY "Allow public delete app_state" ON app_state FOR DELETE USING (true);

-- Insertion des données existantes (Comptes gérants, admin, stations, clôtures, etc.)
`;

for (const [key, value] of Object.entries(db)) {
  const jsonStr = JSON.stringify(value).replace(/'/g, "''");
  sql += `INSERT INTO app_state (key, data) VALUES ('${key}', '${jsonStr}'::jsonb) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();\n\n`;
}

const outputPath = path.resolve(__dirname, '../supabase_schema.sql');
fs.writeFileSync(outputPath, sql, 'utf8');
console.log('Fichier supabase_schema.sql généré avec succès ! Taille:', fs.statSync(outputPath).size, 'octets');
