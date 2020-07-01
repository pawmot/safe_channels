import {APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";

const prod = process.env.PRODUCTION === "true";
const wssAddr = process.env.WSS_ADDRESS;

export const handler: APIGatewayProxyHandler = async (event, _): Promise<APIGatewayProxyResult> => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            production: prod,
            wssAddress: wssAddr
        })
    };
}
