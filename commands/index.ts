export const CREATE_CHANNEL_MESSAGE_TYPE = "createChannel"
export const CREATE_CHANNEL_RESULT_MESSAGE_TYPE = "createChannelResult"
export const CONNECT_TO_CHANNEL_MESSAGE_TYPE = "connectToChannel"
export const CONNECT_TO_CHANNEL_RESULT_MESSAGE_TYPE = "connectToChannelResult"
export const CLIENT_BINARY_EXCHANGE_MESSAGE_TYPE = "clientBinaryExchange"
export const CHANNEL_CLOSED_MESSAGE_TYPE = "channelClosed"
export const PING_MESSAGE_TYPE = "ping"
export const PONG_MESSAGE_TYPE = "pong"

export interface CreateChannelMessage extends Message {
    type: typeof CREATE_CHANNEL_MESSAGE_TYPE,
    channelName: string
}

export interface CreateChannelResultMessage extends Message {
    type: typeof CREATE_CHANNEL_RESULT_MESSAGE_TYPE
    channelName: string,
    code: CreateChannelResultCode
}

export interface ConnectToChannelMessage extends Message {
    type: typeof CONNECT_TO_CHANNEL_MESSAGE_TYPE,
    channelName: string
}

export interface ConnectToChannelResultMessage extends Message {
    type: typeof CONNECT_TO_CHANNEL_RESULT_MESSAGE_TYPE,
    channelName: string,
    code: ConnectToChannelResultCode
}

export interface ClientBinaryExchangeMessage extends Message {
    type: typeof CLIENT_BINARY_EXCHANGE_MESSAGE_TYPE,
    channelName: string,
    binaryContent: string,
    ecdh: boolean
}

export interface ChannelClosedMessage extends Message {
    type: typeof CHANNEL_CLOSED_MESSAGE_TYPE,
    channelName: string
}

export interface PingMessage extends Message {
    type: typeof PING_MESSAGE_TYPE
}

export interface PongMessage extends Message {
    type: typeof PONG_MESSAGE_TYPE
}

export enum CreateChannelResultCode {
    CHANNEL_CREATED,
    CHANNEL_NAME_ALREADY_TAKEN,
    SOMETHING_WENT_WRONG
}

export enum ConnectToChannelResultCode {
    CONNECTED,
    WRONG_CHANNEL,
    SOMETHING_WENT_WRONG
}

export interface Message {
    type: string
}

export function createChannelMessage(channelName: string): CreateChannelMessage {
    return {
        type: CREATE_CHANNEL_MESSAGE_TYPE,
        channelName: channelName
    }
}

export function createChannelResultMessage(channelName: string, code: CreateChannelResultCode): CreateChannelResultMessage {
    return {
        type: CREATE_CHANNEL_RESULT_MESSAGE_TYPE,
        channelName: channelName,
        code: code
    }
}

export function connectToChannelMessage(channelName: string): ConnectToChannelMessage {
    return {
        type: CONNECT_TO_CHANNEL_MESSAGE_TYPE,
        channelName: channelName
    }
}

export function connectToChannelResultMessage(channelName: string, code: ConnectToChannelResultCode): ConnectToChannelResultMessage {
    return {
        type: CONNECT_TO_CHANNEL_RESULT_MESSAGE_TYPE,
        channelName: channelName,
        code: code
    }
}

export function clientBinaryExchangeMessage(channelName: string, binaryContent: string, ecdh: boolean = false): ClientBinaryExchangeMessage {
    return {
        type: CLIENT_BINARY_EXCHANGE_MESSAGE_TYPE,
        channelName: channelName,
        binaryContent: binaryContent,
        ecdh: ecdh
    }
}

export function channelClosedMessage(channelName: string): ChannelClosedMessage {
    return {
        type: CHANNEL_CLOSED_MESSAGE_TYPE,
        channelName: channelName
    }
}

export const PING_MESSAGE: PingMessage = {
    type: PING_MESSAGE_TYPE
}

export const PONG_MESSAGE: PongMessage = {
    type: PONG_MESSAGE_TYPE
}
