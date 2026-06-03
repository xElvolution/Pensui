module pensui::platform {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::event;

    const BASIS_POINTS_TOTAL: u64 = 10000;

    public struct PlatformConfig has key {
        id: UID,
        treasury: address,
        mint_fee_bps: u64,
        tip_fee_bps: u64,
        subscription_fee_bps: u64,
        read_fee_bps: u64,
        total_fees_collected: u64,
    }

    public struct AdminCap has key, store {
        id: UID,
    }

    public struct PlatformCreated has copy, drop {
        platform_id: address,
        treasury: address,
    }

    fun init(ctx: &mut TxContext) {
        let sender = ctx.sender();

        let platform = PlatformConfig {
            id: object::new(ctx),
            treasury: sender,
            mint_fee_bps: 500,
            tip_fee_bps: 250,
            subscription_fee_bps: 1000,
            read_fee_bps: 500,
            total_fees_collected: 0,
        };

        event::emit(PlatformCreated {
            platform_id: object::uid_to_address(&platform.id),
            treasury: sender,
        });

        let admin_cap = AdminCap { id: object::new(ctx) };

        transfer::share_object(platform);
        transfer::transfer(admin_cap, sender);
    }

    public fun split_payment(
        platform: &mut PlatformConfig,
        payment: &mut Coin<SUI>,
        fee_bps: u64,
        creator: address,
        ctx: &mut TxContext,
    ) {
        let total = coin::value(payment);
        let platform_fee = (total * fee_bps) / BASIS_POINTS_TOTAL;
        let creator_amount = total - platform_fee;

        let creator_coin = coin::split(payment, creator_amount, ctx);
        transfer::public_transfer(creator_coin, creator);

        if (platform_fee > 0) {
            let fee_coin = coin::split(payment, platform_fee, ctx);
            transfer::public_transfer(fee_coin, platform.treasury);
            platform.total_fees_collected = platform.total_fees_collected + platform_fee;
        };
    }

    public fun mint_fee_bps(platform: &PlatformConfig): u64 {
        platform.mint_fee_bps
    }

    public fun tip_fee_bps(platform: &PlatformConfig): u64 {
        platform.tip_fee_bps
    }

    public fun subscription_fee_bps(platform: &PlatformConfig): u64 {
        platform.subscription_fee_bps
    }

    public fun read_fee_bps(platform: &PlatformConfig): u64 {
        platform.read_fee_bps
    }

    public fun treasury(platform: &PlatformConfig): address {
        platform.treasury
    }

    public fun update_fees(
        _admin: &AdminCap,
        platform: &mut PlatformConfig,
        mint_fee: u64,
        tip_fee: u64,
        sub_fee: u64,
        read_fee: u64,
    ) {
        platform.mint_fee_bps = mint_fee;
        platform.tip_fee_bps = tip_fee;
        platform.subscription_fee_bps = sub_fee;
        platform.read_fee_bps = read_fee;
    }

    public fun update_treasury(
        _admin: &AdminCap,
        platform: &mut PlatformConfig,
        new_treasury: address,
    ) {
        platform.treasury = new_treasury;
    }
}
