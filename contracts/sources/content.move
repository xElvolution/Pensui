module pensui::content {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::clock::Clock;
    use sui::event;
    use std::string::String;
    use pensui::platform::{Self, PlatformConfig};

    public struct Content has key, store {
        id: UID,
        creator: address,
        blob_id: String,
        title: String,
        description: String,
        content_type: u8,
        mint_price: u64,
        read_price: u64,
        subscription_required: bool,
        total_mints: u64,
        total_tips: u64,
        total_earnings: u64,
        created_at: u64,
    }

    public struct ContentNFT has key, store {
        id: UID,
        content_id: address,
        creator: address,
        collector: address,
        blob_id: String,
        title: String,
        mint_number: u64,
        collected_at: u64,
    }

    public struct ContentPublished has copy, drop {
        content_id: address,
        creator: address,
        blob_id: String,
        title: String,
        mint_price: u64,
        read_price: u64,
    }

    public struct ContentMinted has copy, drop {
        content_id: address,
        collector: address,
        nft_id: address,
        mint_number: u64,
        price: u64,
    }

    public struct ContentTipped has copy, drop {
        content_id: address,
        tipper: address,
        amount: u64,
    }

    public struct ContentRead has copy, drop {
        content_id: address,
        reader: address,
        price: u64,
    }

    public fun publish(
        _platform: &PlatformConfig,
        blob_id: String,
        title: String,
        description: String,
        content_type: u8,
        mint_price: u64,
        read_price: u64,
        subscription_required: bool,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let sender = ctx.sender();
        let content = Content {
            id: object::new(ctx),
            creator: sender,
            blob_id,
            title,
            description,
            content_type,
            mint_price,
            read_price,
            subscription_required,
            total_mints: 0,
            total_tips: 0,
            total_earnings: 0,
            created_at: clock.timestamp_ms(),
        };

        event::emit(ContentPublished {
            content_id: object::uid_to_address(&content.id),
            creator: sender,
            blob_id: content.blob_id,
            title: content.title,
            mint_price,
            read_price,
        });

        transfer::share_object(content);
    }

    public fun mint_collect(
        content: &mut Content,
        platform: &mut PlatformConfig,
        mut payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(content.mint_price > 0, 0);
        assert!(coin::value(&payment) >= content.mint_price, 1);

        content.total_mints = content.total_mints + 1;
        content.total_earnings = content.total_earnings + coin::value(&payment);

        let fee_bps = platform::mint_fee_bps(platform);
        platform::split_payment(platform, &mut payment, fee_bps, content.creator, ctx);

        let remaining = coin::value(&payment);
        if (remaining > 0) {
            transfer::public_transfer(payment, platform::treasury(platform));
        } else {
            coin::destroy_zero(payment);
        };

        let collector = ctx.sender();
        let nft = ContentNFT {
            id: object::new(ctx),
            content_id: object::uid_to_address(&content.id),
            creator: content.creator,
            collector,
            blob_id: content.blob_id,
            title: content.title,
            mint_number: content.total_mints,
            collected_at: clock.timestamp_ms(),
        };

        event::emit(ContentMinted {
            content_id: object::uid_to_address(&content.id),
            collector,
            nft_id: object::uid_to_address(&nft.id),
            mint_number: content.total_mints,
            price: content.mint_price,
        });

        transfer::transfer(nft, collector);
    }

    public fun tip(
        content: &mut Content,
        platform: &mut PlatformConfig,
        mut payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        let amount = coin::value(&payment);
        assert!(amount > 0, 2);

        content.total_tips = content.total_tips + 1;
        content.total_earnings = content.total_earnings + amount;

        let fee_bps = platform::tip_fee_bps(platform);
        platform::split_payment(platform, &mut payment, fee_bps, content.creator, ctx);

        let remaining = coin::value(&payment);
        if (remaining > 0) {
            transfer::public_transfer(payment, platform::treasury(platform));
        } else {
            coin::destroy_zero(payment);
        };

        event::emit(ContentTipped {
            content_id: object::uid_to_address(&content.id),
            tipper: ctx.sender(),
            amount,
        });
    }

    public fun pay_to_read(
        content: &mut Content,
        platform: &mut PlatformConfig,
        mut payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        assert!(content.read_price > 0, 3);
        assert!(coin::value(&payment) >= content.read_price, 4);

        content.total_earnings = content.total_earnings + coin::value(&payment);

        let fee_bps = platform::read_fee_bps(platform);
        platform::split_payment(platform, &mut payment, fee_bps, content.creator, ctx);

        let remaining = coin::value(&payment);
        if (remaining > 0) {
            transfer::public_transfer(payment, platform::treasury(platform));
        } else {
            coin::destroy_zero(payment);
        };

        event::emit(ContentRead {
            content_id: object::uid_to_address(&content.id),
            reader: ctx.sender(),
            price: content.read_price,
        });
    }

    public fun creator(content: &Content): address { content.creator }
    public fun blob_id(content: &Content): String { content.blob_id }
    public fun title(content: &Content): String { content.title }
    public fun mint_price(content: &Content): u64 { content.mint_price }
    public fun read_price(content: &Content): u64 { content.read_price }
    public fun total_mints(content: &Content): u64 { content.total_mints }
}
