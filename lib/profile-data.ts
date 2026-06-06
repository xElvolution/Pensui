"use client";

import type { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { PACKAGE_ID } from "./constants";
import { readFromWalrus } from "./walrus";

export interface ProfileSocials {
  twitter?: string;
  github?: string;
  website?: string;
}

export interface ProfileMetadata {
  bio?: string;
  socials?: ProfileSocials;
}

export interface OnChainProfile {
  /** Object id of the CreatorProfile on Sui. */
  profileObjectId: string;
  owner: string;
  username: string;
  bioBlobId: string;
  avatarBlobId: string;
}

/**
 * Find a CreatorProfile object owned by `owner`, if one exists.
 * CreatorProfile is created via `profile::create_profile` and transferred to
 * the creator's address, so we use getOwnedObjects.
 */
export async function fetchOnChainProfile(
  suiClient: SuiJsonRpcClient,
  owner: string
): Promise<OnChainProfile | null> {
  try {
    const owned = await suiClient.getOwnedObjects({
      owner,
      filter: { StructType: `${PACKAGE_ID}::profile::CreatorProfile` },
      options: { showContent: true },
    });

    const first = owned.data[0];
    if (!first?.data?.content || first.data.content.dataType !== "moveObject") {
      return null;
    }

    const fields = first.data.content.fields as Record<string, unknown>;
    return {
      profileObjectId: first.data.objectId,
      owner: (fields.owner as string) || owner,
      username: (fields.username as string) || "",
      bioBlobId: (fields.bio_blob_id as string) || "",
      avatarBlobId: (fields.avatar_blob_id as string) || "",
    };
  } catch {
    return null;
  }
}

/**
 * Resolve a CreatorProfile's bio+socials JSON from Walrus.
 * The on-chain object only stores the blob_id; the actual metadata lives on
 * Walrus and is keyed off `bio_blob_id`.
 */
export async function fetchProfileMetadata(
  bioBlobId: string
): Promise<ProfileMetadata | null> {
  if (!bioBlobId) return null;
  try {
    const text = await readFromWalrus(bioBlobId);
    return JSON.parse(text) as ProfileMetadata;
  } catch {
    return null;
  }
}

export function serializeProfileMetadata(meta: ProfileMetadata): string {
  return JSON.stringify({
    bio: meta.bio || "",
    socials: {
      twitter: meta.socials?.twitter || "",
      github: meta.socials?.github || "",
      website: meta.socials?.website || "",
    },
  });
}
