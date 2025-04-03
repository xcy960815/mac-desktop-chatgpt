import fsSync from 'fs';
import path from "path";
import { app } from "electron";

const SUBPATH = "config";
const DEFAULTSETTING = { model: "ChatGPT" };
const FILENAME = "settings.json";

interface UserSetting {
  model: string;
}

/**
 * 获取用户设置路径，并确保文件存在
 */
function getUserSettingPath(): string {
  const basePath = app.getPath('userData');
  const dirPath = path.join(basePath, SUBPATH);
  const fileFullPath = path.join(dirPath, FILENAME);

  // 检查目录是否存在，不存在则创建
  if (!fsSync.existsSync(dirPath)) {
    fsSync.mkdirSync(dirPath, { recursive: true });
  }

  // 检查文件是否存在，不存在则创建默认文件
  if (!fsSync.existsSync(fileFullPath)) {
    fsSync.writeFileSync(fileFullPath, JSON.stringify(DEFAULTSETTING, null, 2));
  }

  return fileFullPath;
}

/**
 * 读取用户设置（如果文件不存在，自动创建并返回默认值）
 */
function readUserSetting(): UserSetting {
  const filePath = getUserSettingPath();
  try {
    const data = fsSync.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('读取用户设置失败，返回默认值:', err);
    return DEFAULTSETTING;
  }
}

/**
 * 写入用户设置
 * @param data 数据对象
 */
function writeUserSetting<US = UserSetting>(data: US): US {
  const filePath = getUserSettingPath();
  fsSync.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return data
}

export {
  writeUserSetting,
  readUserSetting,
  getUserSettingPath
};