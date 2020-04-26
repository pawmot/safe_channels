import "source-map-support/register";
import {APIGatewayProxyEvent, Handler} from "aws-lambda";
import {DynamoDB, ApiGatewayManagementApi} from "aws-sdk";
import {DocumentClient} from "aws-sdk/lib/dynamodb/document_client";
import PutItemInput = DocumentClient.PutItemInput;
import * as util from "util";
import GetItemInput = DocumentClient.GetItemInput;
import Key = DocumentClient.Key;

const ddb = new DynamoDB.DocumentClient();
const tableName = process.env["CHANNELS_TABLE"];

export const handleConnection: Handler<APIGatewayProxyEvent> = async (ev): Promise<APIGatewayWebsocketResult> => {
    console.log(`${ev.requestContext.connectionId} is connecting`);

    return {
        statusCode: 200
    }
}

export const handlePing: Handler<APIGatewayProxyEvent> = async (ev): Promise<APIGatewayWebsocketResult> => {
    sendMessageToClient(getCallbackUrl(ev), ev.requestContext.connectionId, new Result(ResultCodes.PONG));

    return {
        statusCode: 200
    }
}

export const handleDisconnection: Handler<APIGatewayProxyEvent> = async (ev): Promise<APIGatewayWebsocketResult> => {
    let finished = false;
    let startKey: Key = null;
    let totalClosed = 0;

    console.log(`${ev.requestContext.connectionId} is disconnecting`);

    while (!finished) {
        const result = await ddb.scan({
            TableName: tableName,
            ExclusiveStartKey: startKey,
            FilterExpression: "contains(connectionIds, :id)",
            ExpressionAttributeValues: { ":id": ev.requestContext.connectionId }
        }).promise();

        if (result.LastEvaluatedKey) {
            startKey = result.LastEvaluatedKey;
        } else {
            finished = true;
        }

        for(let i = 0; i < result.Items.length; i++) {
            const item = result.Items[0];
            const channel: Channel = {
                channelName: <string>item["channelName"],
                isOpen: <boolean>item["isOpen"],
                createdAt: new Date(item["createdAt"]),
                connectionIds: <string[]>(item["connectionIds"].values)
            }
            if(!channel.isOpen) {
                const msg: CloseChannelCommand = {
                    action: "closeChannel",
                    channelName: channel.channelName
                };
                await sendMessageToClient(getCallbackUrl(ev), channel.connectionIds.filter(cid => cid !== ev.requestContext.connectionId)[0], msg)
            }
            await ddb.delete({
                TableName: tableName,
                Key: {"channelName": channel.channelName}
            }).promise();
            totalClosed++;
        }
    }

    console.log(`Number of closed channels: ${totalClosed}`);

    return {
        statusCode: 200
    };
}

export const handleCreateChannel: Handler<APIGatewayProxyEvent> = async (ev): Promise<APIGatewayWebsocketResult> => {
    const cmd = <CreateChannelCommand>JSON.parse(ev.body);
    console.log(`${ev.requestContext.connectionId} is creating channel ${cmd.channelName}`);

    const input: PutItemInput = {
        Item: {
            "channelName": cmd.channelName,
            "connectionIds": ddb.createSet([ev.requestContext.connectionId]),
            "isOpen": true,
            "createdAt": new Date().getTime()
        },
        TableName: tableName,
        ConditionExpression: "attribute_not_exists(channelName)"
    };

    try {
        const ddbResult = await ddb.put(input).promise();

        await sendMessageToClient(
            getCallbackUrl(ev),
            ev.requestContext.connectionId,
            new Result(ResultCodes.CHANNEL_CREATED)
        );

        return {
            statusCode: 200
        }
    } catch (e) {
        if (e.code === "ConditionalCheckFailedException") {
            await sendMessageToClient(
                getCallbackUrl(ev),
                ev.requestContext.connectionId,
                new Result(ResultCodes.CHANNEL_NAME_ALREADY_TAKEN)
            );
            return {
                statusCode: 200
            };
        } else {
            console.log(e);
            await sendMessageToClient(
                getCallbackUrl(ev),
                ev.requestContext.connectionId,
                new Result(ResultCodes.SOMETHING_WENT_WRONG)
            );
            return {
                statusCode: 200
            };
        }
    }
}

export const handleConnectToChannel: Handler<APIGatewayProxyEvent> = async (ev): Promise<APIGatewayWebsocketResult> => {
    const cmd = <ConnectToChannelCommand>JSON.parse(ev.body);
    console.log(`${ev.requestContext.connectionId} is connecting to channel ${cmd.channelName}`);

    const input: GetItemInput = {
        Key: { "channelName" : cmd.channelName},
        TableName: tableName
    }

    // TODO: Introduce an item-level lock to avoid multiple clients racing to connect with a channel - DynamoDB seems to provide such functionality
    const result = await ddb.get(input).promise();

    if (!result.Item) {
        await sendMessageToClient(getCallbackUrl(ev), ev.requestContext.connectionId, new Result(ResultCodes.WRONG_CHANNEL))
        return {
            statusCode: 200
        }
    }

    const channel: Channel = {
        channelName: <string>result.Item["channelName"],
        isOpen: <boolean>result.Item["isOpen"],
        createdAt: new Date(result.Item["createdAt"]),
        connectionIds: <string[]>(result.Item["connectionIds"].values)
    }

    if (!channel.isOpen) {
        await sendMessageToClient(getCallbackUrl(ev), ev.requestContext.connectionId, new Result(ResultCodes.WRONG_CHANNEL))
        return {
            statusCode: 200
        }
    }

    await sendMessageToClient(getCallbackUrl(ev), channel.connectionIds[0], cmd);
    await sendMessageToClient(getCallbackUrl(ev), ev.requestContext.connectionId, new Result(ResultCodes.CONNECTED));

    await ddb.update({
        TableName: tableName,
        Key: { "channelName" : cmd.channelName},
        AttributeUpdates: {
            "isOpen": {
                Value: false
            },
            "connectionIds": {
                Value: ddb.createSet([ev.requestContext.connectionId]),
                Action: "ADD"
            }
        }
    }).promise();

    // TODO: release the item-level lock here

    return {
        statusCode: 200
    };
}

export const handleMessage: Handler<APIGatewayProxyEvent> = async (ev): Promise<APIGatewayWebsocketResult> => {
    const cmd = <MessageCommand>JSON.parse(ev.body);

    const input: GetItemInput = {
        Key: { "channelName" : cmd.channelName},
        TableName: tableName
    }

    const result = await ddb.get(input).promise();

    const channel: Channel = {
        channelName: <string>result.Item["channelName"],
        isOpen: <boolean>result.Item["isOpen"],
        createdAt: new Date(result.Item["createdAt"]),
        connectionIds: <string[]>(result.Item["connectionIds"].values)
    }

    await sendMessageToClient(getCallbackUrl(ev), channel.connectionIds.filter(cid => cid !== ev.requestContext.connectionId)[0], cmd);

    return {
        statusCode: 200
    };
}

const sendMessageToClient = (url: string, connectionId: string, payload: any) => {
    const api = new ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: url,
    });
    return api.postToConnection(
        {
            ConnectionId: connectionId, // connectionId of the receiving ws-client
            Data: JSON.stringify(payload),
        }
    ).promise();
}

function getCallbackUrl(event: APIGatewayProxyEvent): string {
    const domain = event.requestContext.domainName;
    const stage = event.requestContext.stage;
    return util.format(util.format('https://%s/%s', domain, stage));
}

interface Channel {
    channelName: string;
    isOpen: boolean;
    createdAt: Date;
    connectionIds: string[];
}

interface CloseChannelCommand {
    action: "closeChannel";
    channelName: string;
}

interface CreateChannelCommand {
    action: "createChannel";
    channelName: string;
}

interface ConnectToChannelCommand {
    action: "connectToChannel";
    channelName: string;
}

interface MessageCommand {
    action: "message";
    channelName: string;
    type: 0 | 1;
    encodedMsg: string;
}

class Result {
    constructor(public code: ResultCodes) {
    }
}

enum ResultCodes {
    CHANNEL_CREATED,
    CONNECTED,
    CHANNEL_NAME_ALREADY_TAKEN,
    WRONG_CHANNEL,
    PONG,
    SOMETHING_WENT_WRONG
}

interface APIGatewayWebsocketResult {
    statusCode: number;
    body?: string;
}
