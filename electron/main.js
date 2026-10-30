import { app, BrowserWindow } from 'electron';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let serverProcess;

function startServer() {
  const isPackaged = app.isPackaged;
  const serverEntry = isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'dist-server', 'server.cjs')
    : path.resolve(__dirname, '..', 'dist-server', 'server.cjs');
  const command = isPackaged
    ? process.execPath
    : process.platform === 'win32'
      ? 'npm.cmd'
      : 'npm';
  const args = isPackaged ? [serverEntry] : ['run', 'start'];

  serverProcess = spawn(command, args, {
    cwd: isPackaged ? app.getPath('userData') : path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      AMBONI_DATA_DIR: app.getPath('userData'),
      ...(isPackaged ? { AMBONI_APP_DIR: path.join(process.resourcesPath, 'app.asar') } : {}),
      ...(isPackaged ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
    },
    stdio: 'inherit',
    shell: false,
  });

  serverProcess.on('exit', (code) => {
    if (code !== 0 && !app.isQuitting) {
      console.error(`Servidor saiu com código ${code}`);
    }
  });

  serverProcess.on('error', (error) => {
    console.error('Não foi possível iniciar o servidor local:', error);
  });
}

async function waitForServer(url, retries = 60) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch (error) {
      // aguarda o backend subir
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error('Servidor não respondeu em http://localhost:3000');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    title: 'Amboni Alimentos - Controle de Qualidade ERP',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL('http://localhost:3000');
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  startServer();

  try {
    await waitForServer('http://localhost:3000/api/health');
    createWindow();
  } catch (error) {
    console.error(error.message);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});
