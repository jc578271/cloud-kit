import Busboy, { FileInfo } from 'busboy';
import { Readable, Writable } from "stream";
import { IAuthRequest, IRequest, IResponse } from './onRequest';
import { verifyAccessToken, } from './verifyAccessToken';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { IFile } from "./types";

export type IOnFile = (
  fieldName: string,
  file: Readable,
  info: FileInfo,
  pipe: () => any) => Promise<any | void> | any | void;

interface IUploadParams { destination: string; filepath: string; id: string; info: IFile }

export type IOnFinish<IBody, IJson> = (
  req: IRequest<IBody, {}>,
  res: IResponse<IJson>,
  uploadFiles: (callback: (params: IUploadParams[]) => any) => any
) => Promise<any | void> | any | void;

export type IOnAuthFinish<IBody, IJson> = (
  req: IAuthRequest<IBody, {}>,
  res: IResponse<IJson>,
  uploadFiles: (callback: (params: IUploadParams[]) => any) => any
) => Promise<any | void> | any | void;

export const parseFormData = <IBody, IJson>(
  req: IRequest<IBody, {}>,
  res: IResponse<IJson>
) => {
  const isFormData = req.headers["content-type"]?.indexOf('multipart/form-data') !== -1;
  const tmpdir = os.tmpdir();

  if (!isFormData) {
    const onFile: (handler: IOnFile) => void = () => { }
    const onFinish: (handler: IOnFinish<IBody, IJson>) => void = async (handler) => {
      try {
        await handler(req, res, async () => { })
      } catch (e: any) {
        res.json({
          code: 400,
          message: e.message || e.toString() || 'unknown_error',
          stack: process.env.DEBUG ? e.stack?.split('\n') || 'no stack' : undefined
        })
      }
    }
    const onAuthFinish: (handler: IOnAuthFinish<IBody, IJson>) => void = async (handler) => {
      try {
        const data = verifyAccessToken(req.body as any)
        await handler(
          { ...req, verifiedData: data },
          res,
          async () => { }
        )
      } catch (e: any) {
        res.json({
          code: 400,
          message: e.message || e.toString() || 'unknown_error',
          stack: process.env.DEBUG ? e.stack?.split('\n') || 'no stack' : undefined
        })
      }
    }

    return {
      onFile,
      onFinish,
      onAuthFinish
    };
  }
  const busboy = Busboy({ headers: req.headers });

  const fields: any = {}

  /* This code will process each non-file field in the form.*/
  busboy.on('field', (fieldName, val) => {
    if (fieldName.indexOf('[]') !== -1) {
      const key = fieldName.replace('[]', '')
      fields[key] = [...(fields[key] || []), val]
    } else {
      fields[fieldName] = val;
    }
  });

  // const fileWrites: any[] = [];
  const filepaths: string[] = [];
  const fileIds: string[] = [];
  const fileInfos: IFile[] = [];

  /* This code will process each file uploaded. */
  const onFile = () => {
    busboy.on('file', async (fieldName, file, info) => {

      const writeStreamCallback = () => {
        const filepath = path.join(tmpdir, info.filename);
        filepaths.push(filepath);

        let writeStream: Writable;

        writeStream = fs.createWriteStream(filepath)

        file.pipe(writeStream);

        let fileId = "";
        let fileInfo: IFile = { ...info, id: fileId, url: "" }

        file.on("data", (data) => {
          fileId = require('md5')(data.toString()) + "." + require('mime-types').extension(info.mimeType);

          fileInfo = { ...info, id: fileId, url: "" }

          fileIds.push(fileId);
          fileInfos.push(fileInfo);
        })

        file.on("end", () => {
          /* Note: os.tmpdir() points to an in-memory file system on GCF
          Thus, any files in it must fit in the instance's memory.
          const filepath = path.join(tmpdir, filename);
          uploads.push([fieldName, filepath]); */
          if (fieldName.indexOf('[]') !== -1) {
            const key = fieldName.replace('[]', '')
            fields[key] = [...(fields[key] || []), fileInfo]
          } else {
            fields[fieldName] = fileInfo;
          }
        })

        /* File was processed by Busboy; wait for it to be written.
        Note: GCF may not persist saved files across invocations.
        Persistent files must be kept in other locations
        (such as Cloud Storage buckets). */
        // const promise = new Promise((resolve, reject) => {
        //   file.on('end', () => {
        //     writeStream.end();
        //   });
        //   writeStream.on('close', resolve);
        //   writeStream.on('error', reject);
        // });
        // fileWrites.push(promise);
      }

      writeStreamCallback();
    });
  }

  /* Triggered once all uploaded files are processed by Busboy.
  We still need to wait for the disk writes (saves) to complete. */
  const onFinish = (handler: IOnFinish<IBody, IJson>) => {
    busboy.on('finish', async () => {
      try {
        await handler(
          { ...req, body: fields },
          //@ts-ignore
          { ...res, json: (result) => res.status(result.code).json(result) },
          (callback) => callback(filepaths.map((filepath, index) => ({
            filepath,
            destination: fileIds[index],
            id: fileIds[index],
            info: fileInfos[index]
          })).flat()))
      } catch (e: any) {
        res.json({
          code: 400,
          message: e.message || e.toString() || 'unknown_error',
          stack: process.env.DEBUG ? e.stack?.split('\n') || 'no stack' : undefined
        });
      }
    });
    busboy.end(req.body);
  }

  const onAuthFinish = (handler: IOnAuthFinish<IBody, IJson>) => {
    busboy.on('finish', async () => {
      try {
        const newReq = { ...req, body: fields };

        const data = verifyAccessToken(fields);

        await handler(
          { ...newReq, verifiedData: data },
          //@ts-ignore
          { ...res, json: (result) => res.status(result.code).json(result) },
          (callback) => callback(filepaths.map((filepath, index) => ({
            filepath,
            destination: fileIds[index],
            id: fileIds[index],
            info: fileInfos[index]
          })).flat()))
      } catch (e: any) {
        res.json({
          code: 400,
          message: e.message || e.toString() || 'unknown_error',
          stack: process.env.DEBUG ? e.stack?.split('\n') || 'no stack' : undefined,
        })
      }
    });
    busboy.end(req.body);
  }

  return { onFile, onFinish, onAuthFinish }
}
