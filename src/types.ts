import { FileInfo } from "busboy";

export interface IJWTPayload {
  email: string,
  user_id: number,
  system_id: number,
  s: string
}

export type IBodyNumber = number | string;

export interface IFile extends FileInfo {
  id: string;
  url: string;
}

export type IPlatform = 'web' | 'ios' | 'android';
