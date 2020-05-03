import {ec as EC} from "elliptic";
import * as hash from "hash.js";
import {Counter, ModeOfOperation, utils} from "aes-js";
import hex = utils.hex;
import utf8 = utils.utf8;

export class Channel {
  keypair: EC.KeyPair;
  private sharedKey: number[];
  private fingerprint: string;
  private creatorPubKey: string;
  private connecteePubKey: string;

  constructor(public name: string, public isChannelCreator: boolean, public state: ChannelState = ChannelState.OPEN) {
    let ec = new EC("curve25519");
    this.keypair = ec.genKeyPair();
    this.sharedKey = null;
  }

  static withOtherPubKey(channel: Channel, otherPubKey: string) : Channel {
    let chan = new Channel(channel.name, channel.isChannelCreator, ChannelState.CONNECTED);
    chan.keypair = channel.keypair;

    let ec = new EC("curve25519");
    let otherKey = ec.keyFromPublic(otherPubKey, "hex");
    const derivedKey = chan.keypair.derive(otherKey.getPublic());
    chan.sharedKey = hash.sha256().update(derivedKey.toString(16)).digest();
    chan.computeFingerprint(otherPubKey);
    return chan;
  }

  private computeFingerprint(otherPubKey: string) {
    const selfPubKey = this.keypair.getPublic().encodeCompressed("hex");
    if (this.isChannelCreator) {
      this.creatorPubKey = selfPubKey;
      this.connecteePubKey = otherPubKey;
    } else {
      this.creatorPubKey = otherPubKey;
      this.connecteePubKey = selfPubKey;
    }

    this.fingerprint = hash.sha1().update(this.creatorPubKey + this.connecteePubKey).digest("hex").substr(0, 5);
  }

  getEncodedPublicKey(): string {
    return this.keypair.getPublic().encodeCompressed("hex");
  }

  getFingerprint(): string {
    return this.fingerprint;
  }

  encrypt(plaintext: string): string {
    let textBytes = utf8.toBytes(plaintext);
    let aesCtr = new ModeOfOperation.ctr(this.sharedKey, new Counter(5))
    let cipherText = aesCtr.encrypt(textBytes);
    return hex.fromBytes(cipherText); // TODO: change to base64, hex is wasteful.
  }

  decrypt(cyphertext: string) {
    const cipherText = hex.toBytes(cyphertext);
    let aesCtr = new ModeOfOperation.ctr(this.sharedKey, new Counter(5))
    const decryptedBytes = aesCtr.decrypt(cipherText);
    return utf8.fromBytes(decryptedBytes);
  }
}

export enum ChannelState {
  ENTRY,
  OPEN,
  ECDH,
  CONNECTED
}
