export abstract class Message {
  protected constructor(public content: string, public timestamp: Date) {
  }
}

export class SystemMessage extends Message {
  constructor(content: string) {
    super(content, new Date());
  }
}

export class OutgoingMessage extends Message {
  constructor(content: string) {
    super(content, new Date());
  }
}

export class IncomingMessage extends Message {
  constructor(content: string) {
    super(content, new Date());
  }
}
