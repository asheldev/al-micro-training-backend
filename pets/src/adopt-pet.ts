import { DynamoDB, SNS } from 'aws-sdk';
import {
  Handler,
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';

import { generateResponse } from '../../utils';

type ProxyHandler = Handler<APIGatewayProxyEventV2, APIGatewayProxyResultV2>;

const dynamo = new DynamoDB.DocumentClient();
const sns = new SNS();

export const handler: ProxyHandler = async (event: APIGatewayProxyEventV2) => {
	const pathParams = event.pathParameters; 

	try {
		const paramsToFindPet = {	
			TableName: process.env.PETS_TABLE_NAME || '',
			KeyConditionExpression: 'petId = :petId',
			ExpressionAttributeValues: {
				':petId': pathParams.petId,
			},
		};

		const petToUpdate = await dynamo.query(paramsToFindPet).promise();

		if (!petToUpdate) {
			return generateResponse({
				statusCode: 404,
				responseBody: {
					message: 'Pet not found'
				}
			})
		}

		const paramsToUpdatePet: DynamoDB.DocumentClient.UpdateItemInput = {
			TableName: process.env.PETS_TABLE_NAME || '',
			ExpressionAttributeNames: {
				'#pet_status': 'status',
				'#is_adopted': 'isAdopted',
			},
			ExpressionAttributeValues: {
				':s': 'happy',
				':f': true,
			},
			Key: { petId: pathParams.petId },
			ReturnValues: 'ALL_NEW',
			UpdateExpression: 'SET #pet_status = :s, #is_adopted = :f',
		}
	
		const petUpdated = await dynamo.update(paramsToUpdatePet).promise();

		if (petUpdated.Attributes?.status === 'happy') {
			const messageParams: SNS.PublishInput = {
				Message: `La mascota llamada ${petUpdated.Attributes?.name} fue adoptada`,
				TopicArn: process.env.SNS_EVENT_ARN,
			};

			await sns.publish(messageParams).promise();
		};

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

