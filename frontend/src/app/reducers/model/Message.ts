export abstract class Message {
  protected constructor(public content: string) {
  }
}

export class SystemMessage extends Message {
  constructor(content: string) {
    super(content);
  }
}

export class OutgoingMessage extends Message {
  constructor(content: string) {
    super(content);
  }
}

export class IncomingMessage extends Message {
  constructor(content: string) {
    super(content);
  }
}
