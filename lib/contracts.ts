import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, PLATFORM_ID, CLOCK_ID, suiToMist } from "./constants";

export function buildPublishTx(params: {
  blobId: string;
  title: string;
  description: string;
  contentType: number;
  mintPrice: number;
  readPrice: number;
  subscriptionRequired: boolean;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::content::publish`,
    arguments: [
      tx.object(PLATFORM_ID),
      tx.pure.string(params.blobId),
      tx.pure.string(params.title),
      tx.pure.string(params.description),
      tx.pure.u8(params.contentType),
      tx.pure.u64(suiToMist(params.mintPrice)),
      tx.pure.u64(suiToMist(params.readPrice)),
      tx.pure.bool(params.subscriptionRequired),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

export function buildMintCollectTx(params: {
  contentId: string;
  mintPrice: number;
}): Transaction {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [suiToMist(params.mintPrice)]);
  tx.moveCall({
    target: `${PACKAGE_ID}::content::mint_collect`,
    arguments: [
      tx.object(params.contentId),
      tx.object(PLATFORM_ID),
      coin,
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

export function buildTipTx(params: {
  contentId: string;
  amount: number;
}): Transaction {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [suiToMist(params.amount)]);
  tx.moveCall({
    target: `${PACKAGE_ID}::content::tip`,
    arguments: [
      tx.object(params.contentId),
      tx.object(PLATFORM_ID),
      coin,
    ],
  });
  return tx;
}

export function buildPayToReadTx(params: {
  contentId: string;
  readPrice: number;
}): Transaction {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [suiToMist(params.readPrice)]);
  tx.moveCall({
    target: `${PACKAGE_ID}::content::pay_to_read`,
    arguments: [
      tx.object(params.contentId),
      tx.object(PLATFORM_ID),
      coin,
    ],
  });
  return tx;
}

export function buildSubscribeTx(params: {
  creatorAddress: string;
  amount: number;
  durationDays: number;
}): Transaction {
  const tx = new Transaction();
  const durationMs = params.durationDays * 24 * 60 * 60 * 1000;
  const [coin] = tx.splitCoins(tx.gas, [suiToMist(params.amount)]);
  tx.moveCall({
    target: `${PACKAGE_ID}::subscription::subscribe`,
    arguments: [
      tx.object(PLATFORM_ID),
      tx.pure.address(params.creatorAddress),
      coin,
      tx.pure.u64(durationMs),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

export function buildCreateProfileTx(params: {
  username: string;
  bioBlobId: string;
  avatarBlobId: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::profile::create_profile`,
    arguments: [
      tx.pure.string(params.username),
      tx.pure.string(params.bioBlobId),
      tx.pure.string(params.avatarBlobId),
    ],
  });
  return tx;
}

export function buildUpdateProfileTx(params: {
  profileId: string;
  username: string;
  bioBlobId: string;
  avatarBlobId: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::profile::update_profile`,
    arguments: [
      tx.object(params.profileId),
      tx.pure.string(params.username),
      tx.pure.string(params.bioBlobId),
      tx.pure.string(params.avatarBlobId),
    ],
  });
  return tx;
}
