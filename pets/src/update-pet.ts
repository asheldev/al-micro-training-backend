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
	const body = JSON.parse(event.body);

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

		let updateExpression: string[] = [];
		const updateExpressionAttrs = {};
		const updateExpressionValues = {};

		if (body && body.type) {
			updateExpression.push('#pet_type = :type');
			updateExpressionValues[':type'] = body.type;
			updateExpressionAttrs['#pet_type'] = 'type';
		}

		if (body && body.breed) {
			updateExpression.push('#pet_breed = :breed');
			updateExpressionValues[':breed'] = body.breed;
			updateExpressionAttrs['#pet_breed'] = 'breed';
		}

		if (body && body.name) {
			updateExpression.push('#pet_name = :name');
			updateExpressionValues[':name'] = body.name;
			updateExpressionAttrs['#pet_name'] = 'name';
		}

		const paramsToUpdatePet: DynamoDB.DocumentClient.UpdateItemInput = {
			TableName: process.env.PETS_TABLE_NAME || '',
			ExpressionAttributeNames: updateExpressionAttrs,
			ExpressionAttributeValues: updateExpressionValues,
			Key: { petId: queryParams.petId },
			ReturnValues: 'ALL_NEW',
			UpdateExpression: 'SET ' + updateExpression.join(',')
		}
	
		const petUpdated = await dynamo.update(paramsToUpdatePet).promise();

		return generateResponse({
			responseBody: {
				message: 'Pet updated successfull',
				data: petUpdated.Attributes,
			},
		});
	} catch (error) {
		console.error(error);

		return generateResponse({
			statusCode: 400,
			responseBody: {
				message: 'Error updating the pet'
			}
		});
	}
};

