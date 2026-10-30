import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = 3000;
const APP_DIR = process.env.AMBONI_APP_DIR
  ? path.resolve(process.env.AMBONI_APP_DIR)
  : path.resolve(__dirname);

const app = express();
app.use(express.json({ limit: '10mb' }));

// Persistence file
const DATA_DIR = process.env.AMBONI_DATA_DIR
  ? path.resolve(process.env.AMBONI_DATA_DIR)
  : path.resolve(__dirname, '.data');
const DATA_FILE = path.resolve(DATA_DIR, 'db.json');

// Default initial data for Amboni Alimentos
const defaultCategories = [
  {
    id: 'cat-tio-alemao',
    name: 'Arroz Tio Alemão Parbo - 5kg',
    fields: ['Umidade', 'Polimento', 'Quebra'],
    specs: [
      { name: 'Umidade', unit: '%', min: 11.5, max: 13.0, target: 12.5 },
      { name: 'Polimento', unit: 'graus', min: 30, max: 40, target: 35 },
      { name: 'Quebra', unit: '%', min: 0, max: 5.0, target: 3.0 }
    ],
    description: 'Linha nobre para empacotamento 5kg'
  },
  {
    id: 'cat-casca-parbo',
    name: 'Arroz em Casca Parbo',
    fields: ['Umidade', 'Renda', 'Quebra', 'Tp1', 'Resíduo', 'Inteiros'],
    specs: [
      { name: 'Umidade', unit: '%', min: 11.0, max: 13.5, target: 12.5 },
      { name: 'Renda', unit: '%', min: 68.0, max: 80.0, target: 74.0 },
      { name: 'Quebra', unit: '%', min: 0, max: 8.0, target: 5.0 },
      { name: 'Tp1', unit: '%', min: 85.0, max: 100.0, target: 92.0 },
      { name: 'Resíduo', unit: '%', min: 0, max: 10.0, target: 6.0 },
      { name: 'Inteiros', unit: '%', min: 65.0, max: 75.0, target: 68.5 }
    ],
    description: 'Materia-prima recebimento e armazenagem'
  },
  {
    id: 'cat-bica-a',
    name: 'Bica Corrida Parbo Linha-A',
    fields: ['Umidade', 'Polimento', 'Quebra'],
    specs: [
      { name: 'Umidade', unit: '%', min: 11.5, max: 13.2, target: 12.5 },
      { name: 'Polimento', unit: 'graus', min: 32, max: 42, target: 36 },
      { name: 'Quebra', unit: '%', min: 0, max: 6.5, target: 4.5 }
    ],
    description: 'Fluxo intermediário da linha industrial A'
  },
  {
    id: 'cat-branco-tp1',
    name: 'Arroz Branco Tio Alemão Tipo 1',
    fields: ['Umidade', 'Polimento', 'Quebra', 'Amarelados', 'Manchados'],
    specs: [
      { name: 'Umidade', unit: '%', min: 11.5, max: 13.0, target: 12.3 },
      { name: 'Polimento', unit: 'graus', min: 38, max: 48, target: 42 },
      { name: 'Quebra', unit: '%', min: 0, max: 4.0, target: 2.8 },
      { name: 'Amarelados', unit: '%', min: 0, max: 1.0, target: 0.2 },
      { name: 'Manchados', unit: '%', min: 0, max: 1.5, target: 0.3 }
    ],
    description: 'Linha polida branca tipo 1'
  }
];

const sampleRecords = [
  {
    id: 'demo-1',
    date: '2026-09-24',
    time: '08:30',
    categoryId: 'cat-tio-alemao',
    values: { Umidade: '12,3', Polimento: '34', Quebra: '3,2' },
    lotNumber: 'LOTE-PARBO-2026-09A',
    shift: '1º Turno (06h - 14h)',
    productionLine: 'Linha A - Parboilizado',
    sampleOrigin: 'Empacotadora 1',
    inspector: 'Inspetor Carlos Silva',
    status: 'approved',
    notes: 'Padrão visual excelente, grãos íntegros e brilho uniforme.',
    createdAt: '2026-09-24T08:30:00.000Z'
  },
  {
    id: 'demo-2',
    date: '2026-09-24',
    time: '10:15',
    categoryId: 'cat-casca-parbo',
    values: { Umidade: '12,8', Renda: '75,1', Quebra: '6,4', Tp1: '92,1', Resíduo: '7,9', Inteiros: '68,6' },
    lotNumber: 'RECEPCAO-CAM-8841',
    shift: '1º Turno (06h - 14h)',
    productionLine: 'Tombador / Recepção',
    sampleOrigin: 'Recepção Caminhão',
    inspector: 'Ana Paula (Laboratório)',
    status: 'approved',
    notes: 'Carga liberada para descarga no Silo 03.',
    createdAt: '2026-09-24T10:15:00.000Z'
  },
  {
    id: 'demo-3',
    date: '2026-09-24',
    time: '11:45',
    categoryId: 'cat-bica-a',
    values: { Umidade: '12,5', Polimento: '37', Quebra: '5,5' },
    lotNumber: 'BICA-A-TURNO-1',
    shift: '1º Turno (06h - 14h)',
    productionLine: 'Linha A - Parboilizado',
    sampleOrigin: 'Bica Corrida',
    inspector: 'Inspetor Carlos Silva',
    status: 'approved',
    notes: 'Polidor regulado com pressão estável.',
    createdAt: '2026-09-24T11:45:00.000Z'
  },
  {
    id: 'demo-4',
    date: '2026-09-24',
    time: '14:20',
    categoryId: 'cat-tio-alemao',
    values: { Umidade: '13,3', Polimento: '33', Quebra: '4,8' },
    lotNumber: 'LOTE-PARBO-2026-09B',
    shift: '2º Turno (14h - 22h)',
    productionLine: 'Linha A - Parboilizado',
    sampleOrigin: 'Empacotadora 2',
    inspector: 'Marcos Encarregado',
    status: 'warning',
    notes: 'Umidade ligeiramente alta (13,3%). Ajustado secador para estabilizar.',
    createdAt: '2026-09-24T14:20:00.000Z'
  }
];

let state = {
  categories: defaultCategories,
  records: sampleRecords,
  lastUpdated: new Date().toISOString()
};

// Load persisted state if exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    if (raw.trim()) {
      const parsed = JSON.parse(raw);
      if (parsed.categories && parsed.records) {
        state = parsed;
      }
    } else {
      fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
    }
  } else {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  }
} catch (e) {
  console.warn('Could not load persistent data file, starting with memory state:', e);
}

function saveState() {
  state.lastUpdated = new Date().toISOString();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save persistent state:', e);
  }
}

// Active multi-user SSE connections
interface ClientConnection {
  id: string;
  res: express.Response;
  user?: {
    name: string;
    role: string;
  };
}
const sseClients = new Map<string, ClientConnection>();

function broadcastSSE(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [clientId, client] of sseClients.entries()) {
    try {
      client.res.write(payload);
    } catch (err) {
      sseClients.delete(clientId);
    }
  }
}

function broadcastPresence() {
  const activeUsers = Array.from(sseClients.values())
    .map((c) => c.user)
    .filter(Boolean);

  broadcastSSE('presence', {
    activeCount: sseClients.size,
    users: activeUsers
  });
}

// REST API Endpoints
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    organization: 'Amboni Alimentos',
    activeClients: sseClients.size,
    recordsCount: state.records.length,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/state', (_req, res) => {
  res.json(state);
});

// Records CRUD
app.post('/api/records', (req, res) => {
  const record = req.body;
  if (!record || !record.categoryId || !record.date) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
  }

  const existingIdx = state.records.findIndex((r) => r.id === record.id);
  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    state.records[existingIdx] = {
      ...state.records[existingIdx],
      ...record,
      updatedAt: now
    };
    saveState();
    broadcastSSE('record_updated', state.records[existingIdx]);
    return res.json({ success: true, record: state.records[existingIdx] });
  } else {
    const newRecord = {
      ...record,
      id: record.id || `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: record.createdAt || now
    };
    state.records.unshift(newRecord);
    saveState();
    broadcastSSE('record_created', newRecord);
    return res.json({ success: true, record: newRecord });
  }
});

app.delete('/api/records/:id', (req, res) => {
  const { id } = req.params;
  const initialCount = state.records.length;
  state.records = state.records.filter((r) => r.id !== id);

  if (state.records.length !== initialCount) {
    saveState();
    broadcastSSE('record_deleted', { id });
  }
  res.json({ success: true });
});

// Categories CRUD
app.post('/api/categories', (req, res) => {
  const cat = req.body;
  if (!cat || !cat.name) {
    return res.status(400).json({ error: 'Nome da categoria obrigatório.' });
  }

  const existingIdx = state.categories.findIndex((c) => c.id === cat.id);
  if (existingIdx >= 0) {
    state.categories[existingIdx] = { ...state.categories[existingIdx], ...cat };
    saveState();
    broadcastSSE('category_updated', state.categories[existingIdx]);
    return res.json({ success: true, category: state.categories[existingIdx] });
  } else {
    const newCat = {
      ...cat,
      id: cat.id || `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    };
    state.categories.push(newCat);
    saveState();
    broadcastSSE('category_created', newCat);
    return res.json({ success: true, category: newCat });
  }
});

app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  state.categories = state.categories.filter((c) => c.id !== id);
  saveState();
  broadcastSSE('category_deleted', { id });
  res.json({ success: true });
});

// Restore backup
app.post('/api/backup/restore', (req, res) => {
  const { categories, records } = req.body;
  if (!Array.isArray(categories) || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Formato de backup inválido.' });
  }
  state.categories = categories;
  state.records = records;
  saveState();
  broadcastSSE('state_restored', state);
  res.json({ success: true, message: 'Dados restaurados com sucesso.' });
});

// SSE Stream for Real-Time Multi-User Collaboration
app.get('/api/sync/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const userName = (req.query.user as string) || 'Operador Conectado';
  const userRole = (req.query.role as string) || 'Inspetor';

  sseClients.set(clientId, {
    id: clientId,
    res,
    user: { name: userName, role: userRole }
  });

  // Send initial handshake and state
  res.write(`event: handshake\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`);
  broadcastPresence();

  // Heartbeat to keep connection open across mobile networks and proxies
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(clientId);
    broadcastPresence();
  });
});

// Presence update
app.post('/api/presence', (req, res) => {
  const { clientId, name, role } = req.body;
  if (clientId && sseClients.has(clientId)) {
    const client = sseClients.get(clientId)!;
    client.user = { name: name || 'Operador', role: role || 'Inspetor' };
    broadcastPresence();
  }
  res.json({ success: true });
});

// Setup Vite or static serving
async function bootstrap() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(APP_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Amboni ERP CQ] Server running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap();
