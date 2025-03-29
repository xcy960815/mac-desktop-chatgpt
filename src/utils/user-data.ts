import fsSync, { promises } from 'fs';
import path from "path";
import { app } from "electron";


function getDataPath(subPath: string = '') {
  const basePath = app.getPath('userData');
  const fullPath = subPath ? path.join(basePath, subPath) : basePath;
  if (!fsSync.existsSync(fullPath)) {
    fsSync.mkdirSync(fullPath, { recursive: true });
  }
  return fullPath;
}

async function writeUserData(filename: string, data: Object, subPath = '') {
  const dirPath = getDataPath(subPath);
  const filePath = path.join(dirPath, filename);
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  await promises.writeFile(filePath, content);
}

async function readUserData(filename: string, subPath: string = '', defaultValue: string = null) {
  const dirPath = getDataPath(subPath);
  const filePath = path.join(dirPath, filename);
  const data = await promises.readFile(filePath, 'utf-8');
  return data ? data : defaultValue
}

export {
  writeUserData,
  readUserData,
  getDataPath
};