import { IBodyNumber, IFile } from "./types";

type IParams = { [id: string]: number | string | IFile | string[] | number[] | IFile[] | IBodyNumber[] }

export function checkCreateValid(params: IParams) {
  for (let key in params) {
    const value = params[key];
    if (value === undefined) throw new Error('invalid_' + key);
    if (Array.isArray(value) && !value.length) throw new Error('invalid_' + key);
  }
  return true;
}

export function checkUpdateValid(params: IParams) {
  for (let key in params) {
    const value = params[key];
    const isArray = Array.isArray(value);

    if (isArray && value.length) return true;
    if (!isArray && value !== undefined) return true;
  }
  throw new Error('invalid_' + Object.keys(params).join('_'));
}

export function checkImageValid(params: { [id: string]: IFile | IFile[] | undefined }) {
  for (let key in params) {
    const image = params[key];
    const isArray = Array.isArray(image);

    if (!isArray && image !== undefined && !image.mimeType?.startsWith("image")) throw new Error('invalid_' + key);

    if (isArray) for (let imageItem of image) {
      if (imageItem !== undefined && !imageItem.mimeType?.startsWith("image")) throw new Error('invalid_' + key);
    }
  }
  return true;
}
