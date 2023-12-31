import { DynamoDB } from 'aws-sdk';
import {
  Handler,
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';

import { ulid } from 'ulid';
import jwt from 'jsonwebtoken';

import { generateResponse } from '../../utils';
import { saveRequestBodyIntoBucket } from '/opt/shared/logger';

type ProxyHandler = Handler<APIGatewayProxyEventV2, APIGatewayProxyResultV2>;

const dynamo = new DynamoDB.DocumentClient();

export const handler: ProxyHandler = async (event: APIGatewayProxyEventV2) => {
	const authorizationToken = event.headers.authorization;
	const body = JSON.parse(event.body);

	try {
		const decodedToken = jwt.verify(authorizationToken, process.env.JWT_SECRET);

		const bucketNameRequestLogger = process.env.S3_BUCKET_NAME || '';
		const key = ulid().toLowerCase() + decodedToken.fundationId + '.json';

		await saveRequestBodyIntoBucket(bucketNameRequestLogger, event.body, key);
		
		const petToBeCreated = {
			petId: ulid(),
			fundationId: decodedToken.fundationId,
			name: body.name,
			type: body.type,
			breed: body.breed,
			status: 'not happy',
			isAdopted: false
		};

		const params = {
			TableName: process.env.PETS_TABLE_NAME || '',
			Item: { ...petToBeCreated },
		};

		await dynamo.put(params).promise();

		return generateResponse({
			responseBody: {
				message: 'Pet Created!',
				data: params.Item,
			}
		});
	} catch (error) {
		console.error(error);

		return generateResponse({
			statusCode: 400,
			responseBody: {
				message: 'Error iserting item into db'
			}
		});
	}
};
