module pensui::subscription {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::clock::Clock;
    use sui::event;
    use pensui::platform::{Self, PlatformConfig};

    public struct Subscription has key {
        id: UID,
        subscriber: address,
        creator: address,
        expires_at: u64,
        amount_paid: u64,
        created_at: u64,
    }

    public struct SubscriptionCreated has copy, drop {
        subscription_id: address,
        subscriber: address,
        creator: address,
        expires_at: u64,
        amount: u64,
    }

    public struct SubscriptionRenewed has copy, drop {
        subscription_id: address,
        new_expires_at: u64,
        amount: u64,
    }

    public fun subscribe(
        platform: &mut PlatformConfig,
        creator: address,
        mut payment: Coin<SUI>,
        duration_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let amount = coin::value(&payment);
        assert!(amount > 0, 0);
        assert!(duration_ms > 0, 1);

        let fee_bps = platform::subscription_fee_bps(platform);
        platform::split_payment(platform, &mut payment, fee_bps, creator, ctx);

        let remaining = coin::value(&payment);
        if (remaining > 0) {
            transfer::public_transfer(payment, platform::treasury(platform));
        } else {
            coin::destroy_zero(payment);
        };

        let subscriber = ctx.sender();
        let now = clock.timestamp_ms();
        let sub = Subscription {
            id: object::new(ctx),
            subscriber,
            creator,
            expires_at: now + duration_ms,
            amount_paid: amount,
            created_at: now,
        };

        event::emit(SubscriptionCreated {
            subscription_id: object::uid_to_address(&sub.id),
            subscriber,
            creator,
            expires_at: sub.expires_at,
            amount,
        });

        transfer::transfer(sub, subscriber);
    }

    public fun renew(
        sub: &mut Subscription,
        platform: &mut PlatformConfig,
        mut payment: Coin<SUI>,
        duration_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let amount = coin::value(&payment);
        assert!(amount > 0, 2);

        let fee_bps = platform::subscription_fee_bps(platform);
        platform::split_payment(platform, &mut payment, fee_bps, sub.creator, ctx);

        let remaining = coin::value(&payment);
        if (remaining > 0) {
            transfer::public_transfer(payment, platform::treasury(platform));
        } else {
            coin::destroy_zero(payment);
        };

        let now = clock.timestamp_ms();
        let start = if (sub.expires_at > now) { sub.expires_at } else { now };
        sub.expires_at = start + duration_ms;
        sub.amount_paid = sub.amount_paid + amount;

        event::emit(SubscriptionRenewed {
            subscription_id: object::uid_to_address(&sub.id),
            new_expires_at: sub.expires_at,
            amount,
        });
    }

    public fun is_active(sub: &Subscription, clock: &Clock): bool {
        clock.timestamp_ms() < sub.expires_at
    }

    public fun subscriber(sub: &Subscription): address { sub.subscriber }
    public fun creator(sub: &Subscription): address { sub.creator }
    public fun expires_at(sub: &Subscription): u64 { sub.expires_at }
}
