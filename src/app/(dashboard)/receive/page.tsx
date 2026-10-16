"use client";

import * as React from "react";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { getDepositAddressAction, getUserDepositsAction } from "@/actions/wallet.actions";
import {
  Download,
  Copy,
  Check,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  Clock,
  Layers,
  ArrowDownLeft,
} from "lucide-react";

export default function ReceivePage() {
  const [asset, setAsset] = React.useState("USDT");
  const [network, setNetwork] = React.useState("POLYGON");
  const [addressData, setAddressData] = React.useState<{
    address: string;
    confirmationDepth: number;
    isSandbox: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [deposits, setDeposits] = React.useState<any[]>([]);

  const supportedAssets = [
    { ticker: "USDT", name: "Tether USD", networks: ["POLYGON", "ARBITRUM", "BASE", "TRON"] },
    { ticker: "USDC", name: "USD Coin", networks: ["POLYGON", "ARBITRUM", "BASE"] },
    { ticker: "ETH", name: "Ethereum", networks: ["ETHEREUM", "ARBITRUM", "BASE"] },
    { ticker: "BTC", name: "Bitcoin", networks: ["POLYGON"] },
    { ticker: "SOL", name: "Solana", networks: ["SOLANA"] },
  ];

  const currentAssetObj = supportedAssets.find((a) => a.ticker === asset) || supportedAssets[0];

  React.useEffect(() => {
    // If selected network is not valid for selected asset, switch to first valid network
    if (!currentAssetObj.networks.includes(network)) {
      setNetwork(currentAssetObj.networks[0]);
    }
  }, [asset, currentAssetObj, network]);

  React.useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getDepositAddressAction(asset, network).then((res) => {
      if (isMounted) {
        if (res.success && res.data) {
          setAddressData(res.data);
        }
        setIsLoading(false);
      }
    });

    getUserDepositsAction().then((res) => {
      if (isMounted && res.success && res.data) {
        setDeposits(res.data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [asset, network]);

  const handleCopy = () => {
    if (addressData?.address) {
      navigator.clipboard.writeText(addressData.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Simple clean SVG QR code visualizer based on address hash
  const generateQrSvg = (text: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(text)}&color=0D5A3E&bgcolor=FFFFFF`;
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Receive Crypto</h1>
          <p className="text-sm text-muted-foreground">
            Deposit digital assets directly into your institutional custody account.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs w-fit">
          Multi-Chain Custody
        </Badge>
      </div>

      {addressData?.isSandbox && (
        <InlineNotice variant="warning" title="Custody Sandbox Active">
          This address is provisioned in the Fireblocks sandbox environment. Deposits can be tested using simulated webhook callbacks.
        </InlineNotice>
      )}

      {/* ASSET & NETWORK SELECTOR */}
      <Card className="border-border">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Asset Picker */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Select Asset
              </label>
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background font-semibold text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {supportedAssets.map((a) => (
                  <option key={a.ticker} value={a.ticker}>
                    {a.ticker} — {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Network Picker */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Select Deposit Network
              </label>
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background font-semibold text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {currentAssetObj.networks.map((net) => (
                  <option key={net} value={net}>
                    {net === "POLYGON" ? "Polygon PoS (Low Fee)" : net === "ARBITRUM" ? "Arbitrum One (L2)" : net === "BASE" ? "Base (Coinbase L2)" : net === "TRON" ? "Tron (TRC-20)" : net}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Network Mismatch Warning Banner */}
          <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start space-x-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Irreversible Loss Warning:</span> Send only{" "}
              <span className="font-extrabold underline">{asset}</span> via the{" "}
              <span className="font-extrabold underline">{network}</span> network to this address. Sending any other asset or network will result in permanent loss.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ADDRESS & QR CODE DISPLAY */}
      <Card className="border-border shadow-sm">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-lg">Your {asset} ({network}) Deposit Address</CardTitle>
          <CardDescription>
            Scan QR code or copy the address below into your sending wallet or exchange.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground animate-pulse">
              Provisioning secure custodial address...
            </div>
          ) : addressData ? (
            <>
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-3 bg-white rounded-2xl border border-border shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <Image
                    src={generateQrSvg(addressData.address)}
                    alt="Deposit Address QR Code"
                    width={180}
                    height={180}
                    className="rounded-lg"
                    unoptimized
                  />
                </div>
              </div>

              {/* Address Box */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Single-Deposit Custodial Address</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {addressData.confirmationDepth} Block Confirmations
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs sm:text-sm font-bold text-foreground break-all">
                    {addressData.address}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="shrink-0"
                    leftIcon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  >
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              {/* Confirmation Guidelines */}
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div className="p-3 rounded-lg border border-border bg-card">
                  <span className="block font-semibold text-foreground mb-0.5">Min Deposit</span>
                  <span>{asset === "BTC" ? "0.0001 BTC" : asset === "ETH" ? "0.001 ETH" : "1.00 USDT/USDC"}</span>
                </div>
                <div className="p-3 rounded-lg border border-border bg-card">
                  <span className="block font-semibold text-foreground mb-0.5">Confirmation Policy</span>
                  <span>{addressData.confirmationDepth} blocks before available credit</span>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* INBOUND DEPOSIT ACTIVITY TRACKER */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Inbound Deposit Activity</h3>
          <span className="text-xs text-muted-foreground">Live Confirmation Tracking</span>
        </div>

        <Card className="border-border">
          {deposits.length === 0 ? (
            <CardContent className="py-6 text-center text-xs text-muted-foreground">
              No recent inbound deposits detected for this account.
            </CardContent>
          ) : (
            <div className="divide-y divide-border">
              {deposits.map((dep) => (
                <div key={dep.id} className="p-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-semibold text-foreground font-mono">
                        +{dep.amount} {dep.assetTicker} ({dep.networkId})
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[200px] sm:max-w-xs">
                        Tx: {dep.txHash}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge
                      variant={dep.status === "CONFIRMED" ? "success" : "warning"}
                      className="text-[10px]"
                    >
                      {dep.status === "CONFIRMED"
                        ? "Confirmed & Posted"
                        : `${dep.confirmations} / ${dep.requiredConfirmations} Blocks`}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
