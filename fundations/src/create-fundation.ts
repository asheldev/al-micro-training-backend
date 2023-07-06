import { DynamoDB } from 'aws-sdk';
import {
  Handler,
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';

import jwt from 'jsonwebtoken';
import { ulid } from 'ulid';
import { generateResponse } from '../../utils';
import { saveRequestBodyIntoBucket } from '/opt/shared/logger';

type ProxyHandler = Handler<APIGatewayProxyEventV2, APIGatewayProxyResultV2>;

const dynamo = new DynamoDB.DocumentClient();

export const handler: ProxyHandler = async (event: APIGatewayProxyEventV2) => {
	const body = JSON.parse(event.body);
	console.log(saveRequestBodyIntoBucket);

	try {
		const fundationToBeCreated = {
			fundationId: ulid(),
			name: body.name,
		};

		const params = {
			TableName: process.env.FUNDATIONS_TABLE_NAME || '',
			Item: {
				...fundationToBeCreated,
				accessToken: jwt.sign(
					{
						fundationId: fundationToBeCreated.fundationId,
						fundationName: fundationToBeCreated.name,
					},
					process.env.JWT_SECRET
				),
			},
		};

		await dynamo.put(params).promise();

		return generateResponse({
			responseBody: {
				message: 'Fundation Created!',
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
