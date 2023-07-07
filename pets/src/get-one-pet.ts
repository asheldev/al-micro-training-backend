import { DynamoDB } from 'aws-sdk';
import {
  Handler,
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';

import { generateResponse } from '../../utils';

type ProxyHandler = Handler<APIGatewayProxyEventV2, APIGatewayProxyResultV2>;

const dynamo = new DynamoDB.DocumentClient();

export const handler: ProxyHandler = async (event: APIGatewayProxyEventV2) => {
	const petId = event.queryStringParameters.petId;

	try {
		if (!petId) {
			return generateResponse({
				statusCode: 400,
				responseBody: {
					message: 'petId is missed'
				}
			})
		}

		const params = {	
			TableName: process.env.PETS_TABLE_NAME || '',
			KeyConditionExpression: 'petId = :petId',
			ExpressionAttributeValues: {
				':petId': petId,
			}
		};

		const pet = await dynamo.query(params).promise();

		if (!pet) {
			return generateResponse({
				statusCode: 404,
				responseBody: {
					message: 'Pet not found'
				}
			})
		}

		return generateResponse({
			responseBody: pet.Items,
		});
	} catch (error) {
		console.error(error);

		return generateResponse({
			statusCode: 400,
			responseBody: {
				message: 'Error retrieving the pet'
			}
		});
	}
};
