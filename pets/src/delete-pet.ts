import { DynamoDB } from 'aws-sdk';
import {
  Handler,
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';

import jwt from 'jsonwebtoken';

import { generateResponse } from '../../utils';

type ProxyHandler = Handler<APIGatewayProxyEventV2, APIGatewayProxyResultV2>;

const dynamo = new DynamoDB.DocumentClient();

export const handler: ProxyHandler = async (event: APIGatewayProxyEventV2) => {
	const queryParams = event.queryStringParameters;
	const authorizationToken = event.headers.authorization;

	try {
		const decodedToken = jwt.verify(authorizationToken, process.env.JWT_SECRET);

		const paramsToFindPet = {	
			TableName: process.env.PETS_TABLE_NAME || '',
			KeyConditionExpression: 'petId = :petId',
			ExpressionAttributeValues: {
				':petId': queryParams.petId,
			},
		};

		const petToDelete = await dynamo.query(paramsToFindPet).promise();

		if (!petToDelete) {
			return generateResponse({
				statusCode: 404,
				responseBody: {
					message: 'Pet not found'
				}
			})
		}

		if (
			petToDelete.Items && 
			(decodedToken.fundationId !== petToDelete.Items[0].fundationId)
		) {
			return generateResponse({
				statusCode: 404,
				responseBody: {
					message: 'You are not allowed to delete this pet'
				}
			})
		}

		const paramsToDeletePet = {
			TableName: process.env.PETS_TABLE_NAME || '',
			Key: {
				petId: petToDelete.Items && petToDelete.Items[0].fundationId,
			}
		}
	
		await dynamo.delete(paramsToDeletePet).promise();

		return generateResponse({
			responseBody: {
				message: 'Pet deleted successfull',
			},
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
