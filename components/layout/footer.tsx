import Link from "next/link";
import { NetworkStatus } from "./network-status";

export function Footer() {
  return (
    <footer className="border-t border-[color:var(--border)] mt-24">
      <div className="container-page py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2 max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-[color:var(--accent-hover)]"
              >
                <path
                  d="M4 20L18.4 5.6a2.83 2.83 0 0 1 4 4L8 24l-6 2 2-6z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="20" cy="20" r="2" fill="currentColor" />
              </svg>
              <span className="text-[15px] font-semibold tracking-tight">
                PENSUI
              </span>
            </div>
            <p className="text-[14px] leading-relaxed text-[color:var(--fg-muted)]">
              Decentralized media publishing on Sui. Write once, store forever on Walrus, monetize natively in SUI.
            </p>
          </div>

          <div>
            <h4 className="text-[12px] font-medium uppercase tracking-wider text-[color:var(--fg-muted)] mb-4">
              Protocol
            </h4>
            <ul className="space-y-3 text-[14px]">
              <li>
                <Link href="/explore" className="text-[color:var(--fg-secondary)] hover:text-[color:var(--fg)] transition-colors">
                  Explore
                </Link>
              </li>
              <li>
                <Link href="/write" className="text-[color:var(--fg-secondary)] hover:text-[color:var(--fg)] transition-colors">
                  Write
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-[color:var(--fg-secondary)] hover:text-[color:var(--fg)] transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[12px] font-medium uppercase tracking-wider text-[color:var(--fg-muted)] mb-4">
              Built On
            </h4>
            <ul className="space-y-3 text-[14px] text-[color:var(--fg-secondary)]">
              <li>
                <a
                  href="https://sui.io"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[color:var(--fg)] transition-colors"
                >
                  Sui Blockchain
                </a>
              </li>
              <li>
                <a
                  href="https://www.walrus.xyz/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[color:var(--fg)] transition-colors"
                >
                  Walrus Storage
                </a>
              </li>
              <li>
                <a
                  href="https://tatum.io/chain/sui"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[color:var(--fg)] transition-colors"
                >
                  Tatum RPC
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-[color:var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-[12px] mono text-[color:var(--fg-muted)]">
            &copy; {new Date().getFullYear()} PENSUI Protocol
          </p>
          <NetworkStatus />
        </div>
      </div>
    </footer>
  );
}
