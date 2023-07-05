export const generateResponse = ({
	isBase64Encoded = false,
	statusCode = 200,
	responseBody = {}
} = {}) => {
	const response = {
		isBase64Encoded,
		statusCode,
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(responseBody)
	}

	return response;
}

