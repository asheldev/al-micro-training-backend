import { S3 } from 'aws-sdk';

const s3 = new S3();

/**
 * Function to save the request body into a S3 bucket
 *
 * @param {string} bucketName - The name of the bucket where 
 * the request is to be saved
 * @param {string} body - The request Body
 * @param {string} key - The key of the object to be saved
 *
 */
export const saveRequestBodyIntoBucket = async (
	bucketName: string,
	body: string,
	key: string
) => {
	const params: S3.PutObjectRequest = {
		Body: body,
		Bucket: bucketName,
		Key: key,
	};

	try {
		await s3.putObject(params).promise();
		
		console.log('Request body saved successfull!');
	} catch (err) {
		console.error('Something was wrong: ', err);
	};
};
