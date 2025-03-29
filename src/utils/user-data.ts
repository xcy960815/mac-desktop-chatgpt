// utils/userData.js
import fsSync, { promises } from 'fs'; // 异步 API    // 同步 API
import path from "path"
import { app } from "electron"

// const FILENAME = "" //filename
/**
 * 获取 userData 路径（自动创建子目录）
 * @param {string} [subPath] - 子目录（如 'config'）
 * @returns {string} 完整路径
 */
function getDataPath(subPath: string = '') {
  const basePath = app.getPath('userData');
  const fullPath = subPath ? path.join(basePath, subPath) : basePath;
  if (!fsSync.existsSync(fullPath)) {
    fsSync.mkdirSync(fullPath, { recursive: true }); // 递归创建目录
  }

  return fullPath;
}

/**
 * 异步写入数据
 * @param {string} filename - 文件名（如 'config.json'）
 * @param {any} data - 要写入的数据（JSON/文本/Buffer）
 * @param {string} [subPath] - 子目录（可选）
 */
async function writeUserData(filename: string, data: Object, subPath = '') {
  const dirPath = getDataPath(subPath);
  const filePath = path.join(dirPath, filename);
  // 根据数据类型选择写入格式
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  await promises.writeFile(filePath, content);
}

/**
 * 同步写入数据
 * @param {string} filename - 文件名
 * @param {any} data - 数据
 * @param {string} [subPath] - 子目录
 */
function writeUserDataSync(filename: string, data: Object, subPath: string = '') {
  const dirPath = getDataPath(subPath);
  const filePath = path.join(dirPath, filename);

  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  fsSync.writeFileSync(filePath, content);
}

// 在 utils/userData.js 中添加读取方法
async function readUserData(filename: string, subPath: string = '') {

  const dirPath = getDataPath(subPath);

  const filePath = path.join(dirPath, filename);

  const data = await promises.readFile(filePath, 'utf-8');
  try {
    return JSON.parse(data); // 自动解析 JSON
  } catch {
    return data; // 返回原始文本或二进制
  }
}

export { writeUserData, writeUserDataSync, getDataPath, readUserData };