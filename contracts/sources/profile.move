module pensui::profile {
    use sui::transfer;
    use sui::event;
    use std::string::String;

    public struct CreatorProfile has key {
        id: UID,
        owner: address,
        username: String,
        bio_blob_id: String,
        avatar_blob_id: String,
        total_earnings: u64,
        subscriber_count: u64,
        content_count: u64,
    }

    public struct ProfileCreated has copy, drop {
        profile_id: address,
        owner: address,
        username: String,
    }

    public struct ProfileUpdated has copy, drop {
        profile_id: address,
        username: String,
    }

    public fun create_profile(
        username: String,
        bio_blob_id: String,
        avatar_blob_id: String,
        ctx: &mut TxContext,
    ) {
        let sender = ctx.sender();
        let profile = CreatorProfile {
            id: object::new(ctx),
            owner: sender,
            username,
            bio_blob_id,
            avatar_blob_id,
            total_earnings: 0,
            subscriber_count: 0,
            content_count: 0,
        };

        event::emit(ProfileCreated {
            profile_id: object::uid_to_address(&profile.id),
            owner: sender,
            username: profile.username,
        });

        transfer::transfer(profile, sender);
    }

    public fun update_profile(
        profile: &mut CreatorProfile,
        username: String,
        bio_blob_id: String,
        avatar_blob_id: String,
        ctx: &TxContext,
    ) {
        assert!(profile.owner == ctx.sender(), 0);
        profile.username = username;
        profile.bio_blob_id = bio_blob_id;
        profile.avatar_blob_id = avatar_blob_id;

        event::emit(ProfileUpdated {
            profile_id: object::uid_to_address(&profile.id),
            username: profile.username,
        });
    }

    public fun increment_content_count(profile: &mut CreatorProfile) {
        profile.content_count = profile.content_count + 1;
    }

    public fun add_earnings(profile: &mut CreatorProfile, amount: u64) {
        profile.total_earnings = profile.total_earnings + amount;
    }

    public fun increment_subscribers(profile: &mut CreatorProfile) {
        profile.subscriber_count = profile.subscriber_count + 1;
    }

    public fun owner(profile: &CreatorProfile): address { profile.owner }
    public fun username(profile: &CreatorProfile): String { profile.username }
}
