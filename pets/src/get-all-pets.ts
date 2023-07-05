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
	const queryParams = event.queryStringParameters;
	const fundationId = event.pathParameters.fundationId;

	try {
		let filterExpression = '';
		const filterExpressionValues = {
			':fundationId': fundationId,
		};
		const filterExpressionAttrs = {
			'#fundationId': 'fundationId'
		};

		if (queryParams && queryParams.type) {
			filterExpression += filterExpression
				? ' and #pet_type = :type'
				: '#pet_type = :type';
			filterExpressionValues[':type'] = queryParams.type;
			filterExpressionAttrs['#pet_type'] = 'type';
		}

		if (queryParams && queryParams.breed) {
			filterExpression += filterExpression
				? ' and contains(#pet_breed, :breed)'
				: 'contains(#pet_breed, :breed)';
			filterExpressionValues[':breed'] = queryParams.breed;
			filterExpressionAttrs['#pet_breed'] = 'breed';
		}

		if (queryParams && queryParams.name) {
			filterExpression += filterExpression
				? ' and contains(#pet_name, :name)'
				: 'contains(#pet_name, :name)';
			filterExpressionValues[':name'] = queryParams.name;
			filterExpressionAttrs['#pet_name'] = 'name';
		}

		const params: DynamoDB.DocumentClient.QueryInput = {	
			TableName: process.env.PETS_TABLE_NAME || '',
			IndexName: process.env.PETS_TABLE_SEC_INDEX,
			KeyConditionExpression: '#fundationId = :fundationId',
			ExpressionAttributeNames: filterExpressionAttrs,
			FilterExpression: filterExpression || undefined,
			ExpressionAttributeValues: filterExpressionValues,
		};

		const pets = await dynamo.query(params).promise();

		if (!pets) {
			return generateResponse({
				statusCode: 404,
				responseBody: {
					message: 'Pets not found'
				}
			})
		}

		return generateResponse({
			responseBody: pets.Items,
		});
	} catch (error) {
		console.error(error);

		return generateResponse({
			statusCode: 400,
			responseBody: {
				message: 'Error retrieving the pets'
			}
		});
	}
};
