import { onRequest as _onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { Request, Response } from 'express';
import { IOnAuthFinish, IOnFile, IOnFinish, parseFormData } from "./formData";
import { IVerifiedData } from "./verifyAccessToken";

setGlobalOptions({region: 'asia-southeast1'});

export type IRequest<IBody, IParams> = Omit<Request, 'body' | 'params'>
	& { body: IBody; params: IParams }

export type IAuthRequest<IBody, IParams> = Omit<Request, 'body' | 'params'>
	& {
		body: IBody;
		params: IParams;
		verifiedData: IVerifiedData
	}

export type IResponse<IRes> = Response<{ code: 200 | 400 | 401 | 403 | 404; message: string; stack?: string[] } & (IRes | {})>

export function onRequest<
	// IParams extends {[id: string]: any},
	IBody extends object,
	IJson
>(
	handler: (
		onFinish: (handler: IOnFinish<IBody, IJson>) => void,
		onFile: (handler: IOnFile) => void,
	) => any | Promise<any>
) {
	const _handler = async (
		req: IRequest<IBody, {}>,
		res: IResponse<IJson>
	) => {
		if (process.env.DEBUG) {
			res.set('Access-Control-Allow-Origin', "*")
			res.set('Access-Control-Allow-Methods', 'GET, POST');
		}

		const { onFile, onFinish } = parseFormData(req, res);

		handler(
			onFinish,
			onFile,
		)
	}

	return _onRequest(_handler)
}
export function onAuthRequest<
	// IParams extends {[id: string]: any},
	IBody extends { client_key: string, access_token: string },
	IJson
>(
	handler: (
		onFinish: (handler: IOnAuthFinish<IBody, IJson>) => void,
		onFile: (handler: IOnFile) => void,
	) => any | Promise<any>
) {
	const _handler = async (
		req: IRequest<IBody, {}>,
		res: IResponse<IJson>
	) => {
		if (process.env.DEBUG) {
			res.set('Access-Control-Allow-Origin', "*")
			res.set('Access-Control-Allow-Methods', 'GET, POST');
		}

		const { onFile, onAuthFinish } = parseFormData(req, res);

		handler(
			onAuthFinish,
			onFile,
		)
	}

	return _onRequest(_handler)
}
