import "source-map-support/register";
import {APIGatewayProxyEvent, Handler} from "aws-lambda";
import {ApiGatewayManagementApi, DynamoDB} from "aws-sdk";
import {DocumentClient} from "aws-sdk/lib/dynamodb/document_client";
import * as util from "util";
import {
    channelClosedMessage,
    ClientBinaryExchangeMessage,
    ConnectToChannelMessage,
    ConnectToChannelResultCode,
    connectToChannelResultMessage,
    CreateChannelMessage,
    CreateChannelResultCode,
    createChannelResultMessage,
    CreateChannelResultMessage,
    PONG_MESSAGE
} from "../commands";
import PutItemInput = DocumentClient.PutItemInput;
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
    await sendMessageToClient(getCallbackUrl(ev), ev.requestContext.connectionId, PONG_MESSAGE);

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
            ExpressionAttributeValues: {":id": ev.requestContext.connectionId}
        }).promise();

        if (result.LastEvaluatedKey) {
            startKey = result.LastEvaluatedKey;
        } else {
            finished = true;
        }

        for (let i = 0; i < result.Items.length; i++) {
            const item = result.Items[0];
            const channel: Channel = {
                channelName: <string>item["channelName"],
                isOpen: <boolean>item["isOpen"],
                createdAt: new Date(item["createdAt"]),
                connectionIds: <string[]>(item["connectionIds"].values)
            }
            if (!channel.isOpen) {
                const msg = channelClosedMessage(channel.channelName);
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
    const cmd = <CreateChannelMessage>JSON.parse(ev.body);
    console.log(`${ev.requestContext.connectionId} is creating channel ${cmd.channelName}`);

    function result(code: CreateChannelResultCode): CreateChannelResultMessage {
        return createChannelResultMessage(cmd.channelName, code);
    }

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
            result(CreateChannelResultCode.CHANNEL_CREATED)
        );

        return {
            statusCode: 200
        }
    } catch (e) {
        if (e.code === "ConditionalCheckFailedException") {
            await sendMessageToClient(
                getCallbackUrl(ev),
                ev.requestContext.connectionId,
                result(CreateChannelResultCode.CHANNEL_NAME_ALREADY_TAKEN)
            );
            return {
                statusCode: 200
            };
        } else {
            console.log(e);
            await sendMessageToClient(
                getCallbackUrl(ev),
                ev.requestContext.connectionId,
                result(CreateChannelResultCode.SOMETHING_WENT_WRONG)
            );
            return {
                statusCode: 200
            };
        }
    }
}

export const handleConnectToChannel: Handler<APIGatewayProxyEvent> = async (ev): Promise<APIGatewayWebsocketResult> => {
    const cmd = <ConnectToChannelMessage>JSON.parse(ev.body);
    console.log(`${ev.requestContext.connectionId} is connecting to channel ${cmd.channelName}`);

    const input: GetItemInput = {
        Key: {"channelName": cmd.channelName},
        TableName: tableName
    }

    // TODO: Introduce an item-level lock to avoid multiple clients racing to connect with a channel - DynamoDB seems to provide such functionality
    const result = await ddb.get(input).promise();

    if (!result.Item) {
        await sendMessageToClient(
            getCallbackUrl(ev),
            ev.requestContext.connectionId,
            connectToChannelResultMessage(cmd.channelName, ConnectToChannelResultCode.WRONG_CHANNEL))
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
        await sendMessageToClient(
            getCallbackUrl(ev),
            ev.requestContext.connectionId,
            connectToChannelResultMessage(cmd.channelName, ConnectToChannelResultCode.WRONG_CHANNEL))
        return {
            statusCode: 200
        }
    }

    await sendMessageToClient(
        getCallbackUrl(ev),
        channel.connectionIds[0],
        connectToChannelResultMessage(cmd.channelName, ConnectToChannelResultCode.CONNECTED));
    await sendMessageToClient(
        getCallbackUrl(ev),
        ev.requestContext.connectionId,
        connectToChannelResultMessage(cmd.channelName, ConnectToChannelResultCode.CONNECTED));

    await ddb.update({
        TableName: tableName,
        Key: {"channelName": cmd.channelName},
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
    const cmd = <ClientBinaryExchangeMessage>JSON.parse(ev.body);

    const input: GetItemInput = {
        Key: {"channelName": cmd.channelName},
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

interface APIGatewayWebsocketResult {
    statusCode: number;
    body?: string;
}
